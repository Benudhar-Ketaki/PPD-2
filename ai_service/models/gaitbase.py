import torch
import torch.nn as nn
import torch.nn.functional as F

class BasicConvBlock(nn.Module):
    def __init__(self, in_c, out_c, kernel_size=3, stride=1, padding=1):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, kernel_size=kernel_size, stride=stride, padding=padding, bias=False)
        self.bn = nn.BatchNorm2d(out_c)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.bn(self.conv(x)))

class HorizontalPyramidPooling(nn.Module):
    """
    Horizontal Pyramid Pooling (HPP) layer used in GaitBase / OpenGait.
    Divides the feature map horizontally into 16, 8, 4, 2, 1 strips
    to preserve spatial posture representations.
    """
    def __init__(self, bin_num=[16, 8, 4, 2, 1]):
        super().__init__()
        self.bin_num = bin_num

    def forward(self, x):
        """
        Input: (B, C, H, W)
        Output: (B, C, total_bins)
        """
        n, c, h, w = x.size()
        features = []
        for b in self.bin_num:
            # Adaptive pool over width, partitioned along height
            pooled = F.adaptive_max_pool2d(x, (b, 1))
            features.append(pooled.view(n, c, b))
        return torch.cat(features, dim=-1)

class GaitBase(nn.Module):
    """
    GaitBase: Practical Deep Gait Recognition Baseline (OpenGait compatible).
    Takes a sequence of normalized 64x64 silhouette frames:
    (Batch, 1, Frames, 64, 64) -> 256-D normalized biometric embedding.
    """
    def __init__(self, in_channels=1, hidden_dim=64, embedding_dim=256):
        super().__init__()
        
        # 2D Spatial Convolutional Backbone
        self.layer1 = nn.Sequential(
            BasicConvBlock(in_channels, hidden_dim),
            BasicConvBlock(hidden_dim, hidden_dim),
            nn.MaxPool2d(kernel_size=2, stride=2)  # 64x64 -> 32x32
        )
        self.layer2 = nn.Sequential(
            BasicConvBlock(hidden_dim, hidden_dim * 2),
            BasicConvBlock(hidden_dim * 2, hidden_dim * 2),
            nn.MaxPool2d(kernel_size=2, stride=2)  # 32x32 -> 16x16
        )
        self.layer3 = nn.Sequential(
            BasicConvBlock(hidden_dim * 2, hidden_dim * 4),
            BasicConvBlock(hidden_dim * 4, hidden_dim * 4)  # 16x16
        )

        # Horizontal Pyramid Pooling
        self.hpp = HorizontalPyramidPooling(bin_num=[16, 8, 4, 2, 1]) # 31 parts
        total_parts = sum([16, 8, 4, 2, 1])

        # Separate Head Projectors
        self.fc = nn.Linear(hidden_dim * 4, embedding_dim)
        self.bn = nn.BatchNorm1d(embedding_dim)

    def forward(self, x):
        """
        x: (B, C, T, H, W) e.g., (1, 1, 30, 64, 64)
        """
        if x.dim() == 5:
            b, c, t, h, w = x.size()
            # Collapse batch and time for 2D spatial feature extraction
            x = x.permute(0, 2, 1, 3, 4).contiguous().view(b * t, c, h, w)
        else:
            b = x.size(0)
            t = 1

        f1 = self.layer1(x)
        f2 = self.layer2(f1)
        f3 = self.layer3(f2) # (b * t, 256, 16, 16)

        # Temporal Pooling: Max-pooling across the gait cycle frames
        _, c_out, h_out, w_out = f3.size()
        f3 = f3.view(b, t, c_out, h_out, w_out)
        temporal_feat = torch.max(f3, dim=1)[0] # (b, 256, 16, 16)

        # Horizontal pooling strips
        parts = self.hpp(temporal_feat) # (b, 256, 31)
        pooled_global = torch.mean(parts, dim=-1) # (b, 256)

        # Embedding projection & L2 normalization
        embed = self.fc(pooled_global)
        embed = self.bn(embed)
        normalized_embed = F.normalize(embed, p=2, dim=-1) # (b, 256)

        return normalized_embed
