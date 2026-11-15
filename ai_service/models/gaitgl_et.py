import torch
import torch.nn as nn
import torch.nn.functional as F

class DepthwiseSeparableConv2d(nn.Module):
    """
    Depthwise-Separable Convolution (DW-Conv2D) to minimize FLOPs and parameter footprint:
    1. Depthwise convolution: applies separate filter per channel.
    2. Pointwise convolution: 1x1 linear combination across channels.
    """
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1, padding=1):
        super().__init__()
        self.depthwise = nn.Conv2d(
            in_channels, in_channels, kernel_size=kernel_size,
            stride=stride, padding=padding, groups=in_channels, bias=False
        )
        self.pointwise = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.bn(self.pointwise(self.depthwise(x))))

class MultiScaleSpatialBlock(nn.Module):
    """
    Multi-Scale Spatial Receptive Field Block:
    Applies parallel 3x3 and 5x5 depthwise convolutions to capture both
    micro-contours (limbs, ankles) and holistic torso silhouettes.
    """
    def __init__(self, in_channels, out_channels):
        super().__init__()
        mid_channels = out_channels // 2
        self.branch3x3 = DepthwiseSeparableConv2d(in_channels, mid_channels, kernel_size=3, padding=1)
        self.branch5x5 = DepthwiseSeparableConv2d(in_channels, mid_channels, kernel_size=5, padding=2)
        self.proj = nn.Sequential(
            nn.Conv2d(out_channels, out_channels, kernel_size=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        f3 = self.branch3x3(x)
        f5 = self.branch5x5(x)
        merged = torch.cat([f3, f5], dim=1)
        return self.proj(merged)

class TemporalMotionDifferenceBranch(nn.Module):
    """
    Explicit Temporal Motion-Difference Branch:
    Computes consecutive frame differences D(t) = |S(t+1) - S(t)| to capture
    limb swing velocity and boundary dynamics that remain invariant to bulky apparel.
    """
    def __init__(self, in_channels=1, hidden_dim=64, out_channels=256):
        super().__init__()
        self.conv1 = DepthwiseSeparableConv2d(in_channels, hidden_dim, kernel_size=3, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2)  # 64x64 -> 32x32
        
        self.conv2 = DepthwiseSeparableConv2d(hidden_dim, hidden_dim * 2, kernel_size=3, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2)  # 32x32 -> 16x16
        
        self.conv3 = DepthwiseSeparableConv2d(hidden_dim * 2, out_channels, kernel_size=3, padding=1)

    def forward(self, x):
        """
        x: (B, 1, T, 64, 64)
        """
        b, c, t, h, w = x.size()
        # Compute first-order temporal difference: D(t) = |S(t+1) - S(t)|
        diff = torch.abs(x[:, :, 1:, :, :] - x[:, :, :-1, :, :])  # (B, 1, T-1, H, W)
        t_diff = t - 1

        # Flatten batch and time
        diff = diff.permute(0, 2, 1, 3, 4).contiguous().view(b * t_diff, c, h, w)
        
        f1 = self.pool1(self.conv1(diff))
        f2 = self.pool2(self.conv2(f1))
        f3 = self.conv3(f2)  # (b * t_diff, out_channels, 16, 16)

        # Reshape and apply temporal max-pooling
        _, c_out, h_out, w_out = f3.size()
        f3 = f3.view(b, t_diff, c_out, h_out, w_out)
        motion_feature = torch.max(f3, dim=1)[0]  # (B, out_channels, 16, 16)
        return motion_feature

class AdaptivePartAwareAttention(nn.Module):
    """
    Adaptive Part-Aware Attention:
    Dynamically re-calibrates the importance of horizontal body segments.
    Attenuates occluded torso strips (e.g., under bulky coats) and
    enhances reliable limb and foot features.
    """
    def __init__(self, channels=256, height_parts=16, reduction=4):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(channels, channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, 1, bias=False)
        )

    def forward(self, x):
        """
        x: (B, C, H, W)
        """
        b, c, h, w = x.size()
        # Pool across width to obtain strip descriptors (B, C, H)
        strip_desc = torch.mean(x, dim=-1).permute(0, 2, 1)  # (B, H, C)
        weights = self.fc(strip_desc)  # (B, H, 1)
        weights = F.softmax(weights, dim=1)  # (B, H, 1) Softmax over height
        weights = weights.permute(0, 2, 1).unsqueeze(-1)  # (B, 1, H, 1)

        # Scale features adaptively
        return x * weights

class GatedSpatialTemporalFusion(nn.Module):
    """
    Gated Spatial-Temporal Feature Fusion:
    F_fused = alpha * F_spatial + (1 - alpha) * F_temporal
    where alpha is a learnable gating parameter in [0, 1].
    """
    def __init__(self, channels=256):
        super().__init__()
        self.gate = nn.Sequential(
            nn.Conv2d(channels * 2, channels, kernel_size=1, bias=True),
            nn.BatchNorm2d(channels),
            nn.Sigmoid()
        )

    def forward(self, f_spatial, f_temporal):
        concat = torch.cat([f_spatial, f_temporal], dim=1)  # (B, 2C, H, W)
        alpha = self.gate(concat)  # (B, C, H, W)
        fused = alpha * f_spatial + (1.0 - alpha) * f_temporal
        return fused

class HorizontalPyramidPooling(nn.Module):
    """
    HPP multi-scale decomposition: partitions height into [16, 8, 4, 2, 1] strips.
    """
    def __init__(self, bin_num=[16, 8, 4, 2, 1]):
        super().__init__()
        self.bin_num = bin_num

    def forward(self, x):
        n, c, h, w = x.size()
        features = []
        for b in self.bin_num:
            pooled = F.adaptive_max_pool2d(x, (b, 1))
            features.append(pooled.view(n, c, b))
        return torch.cat(features, dim=-1)  # (B, C, 31)

class GaitGLET(nn.Module):
    """
    Proposed GaitGL-ET Architecture:
    Efficient Temporal-Attention GaitGL with:
      - Lightweight Multi-Scale Spatial Backbone (DW-Conv)
      - Temporal Motion-Difference Branch (|S_{t+1} - S_t|)
      - Gated Spatial-Temporal Feature Fusion
      - Adaptive Part-Aware Attention
      - Multi-Scale Horizontal Pyramid Pooling (HPP)
      - 256-D L2-Normalized Embedding Head
    """
    def __init__(self, in_channels=1, hidden_dim=64, embedding_dim=256):
        super().__init__()
        
        # Branch 1: Lightweight Multi-Scale Spatial Backbone
        self.spatial_layer1 = nn.Sequential(
            DepthwiseSeparableConv2d(in_channels, hidden_dim, kernel_size=3, padding=1),
            DepthwiseSeparableConv2d(hidden_dim, hidden_dim, kernel_size=3, padding=1),
            nn.MaxPool2d(2, 2)  # 64x64 -> 32x32
        )
        self.spatial_layer2 = nn.Sequential(
            MultiScaleSpatialBlock(hidden_dim, hidden_dim * 2),
            nn.MaxPool2d(2, 2)  # 32x32 -> 16x16
        )
        self.spatial_layer3 = nn.Sequential(
            MultiScaleSpatialBlock(hidden_dim * 2, embedding_dim)
        )

        # Branch 2: Explicit Temporal Motion-Difference Branch
        self.motion_branch = TemporalMotionDifferenceBranch(
            in_channels=in_channels, hidden_dim=hidden_dim, out_channels=embedding_dim
        )

        # Gated Fusion
        self.fusion = GatedSpatialTemporalFusion(channels=embedding_dim)

        # Adaptive Part Attention
        self.part_attention = AdaptivePartAwareAttention(channels=embedding_dim, height_parts=16)

        # Multi-Scale Pyramid Pooling (31 strips)
        self.hpp = HorizontalPyramidPooling(bin_num=[16, 8, 4, 2, 1])

        # Head Projector & BNNeck
        self.fc = nn.Linear(embedding_dim, embedding_dim)
        self.bnneck = nn.BatchNorm1d(embedding_dim)

    def forward(self, x):
        """
        Input: (B, 1, T, 64, 64) where T is frame count
        Output: (B, 256) normalized unit gait embedding
        """
        b, c, t, h, w = x.size()

        # 1. Branch 1: Spatial Feature Extraction
        x_flat = x.permute(0, 2, 1, 3, 4).contiguous().view(b * t, c, h, w)
        s1 = self.spatial_layer1(x_flat)
        s2 = self.spatial_layer2(s1)
        s3 = self.spatial_layer3(s2)  # (b * t, 256, 16, 16)
        
        _, c_out, h_out, w_out = s3.size()
        s3 = s3.view(b, t, c_out, h_out, w_out)
        f_spatial = torch.max(s3, dim=1)[0]  # Temporal max-pooling -> (B, 256, 16, 16)

        # 2. Branch 2: Temporal Motion-Difference Extraction
        f_temporal = self.motion_branch(x)  # (B, 256, 16, 16)

        # 3. Gated Spatial-Temporal Feature Fusion
        f_fused = self.fusion(f_spatial, f_temporal)  # (B, 256, 16, 16)

        # 4. Adaptive Part-Aware Attention
        f_att = self.part_attention(f_fused)  # (B, 256, 16, 16)

        # 5. Multi-Scale Horizontal Pyramid Pooling
        parts = self.hpp(f_att)  # (B, 256, 31)
        pooled_global = torch.mean(parts, dim=-1)  # (B, 256)

        # 6. Embedding Projection & L2 Normalization
        feat = self.bnneck(self.fc(pooled_global))
        normalized_embed = F.normalize(feat, p=2, dim=-1)  # (B, 256), ||e||_2 = 1.0

        return normalized_embed

if __name__ == '__main__':
    # Unit validation
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = GaitGLET(in_channels=1, hidden_dim=64, embedding_dim=256).to(device)
    model.eval()

    sample_input = torch.randn(2, 1, 30, 64, 64).to(device)
    with torch.no_grad():
        output = model(sample_input)

    print("GaitGL-ET Forward Pass Successful!")
    print("Output Shape:", output.shape)
    print("L2 Norm of Output (Batch 0):", torch.norm(output[0], p=2).item())
    
    # Calculate parameter count
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total Parameters: {total_params:,} ({total_params/1e6:.2f} M)")
    print(f"Trainable Parameters: {trainable_params:,}")
