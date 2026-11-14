import numpy as np
import torch

class SilhouettePreprocessor:
    """
    Pedestrian silhouette extraction & normalization pipeline:
    Extracts person bounding boxes, isolates binary silhouettes,
    centers subject, and standardizes to (64, 64) format.
    """
    def __init__(self, target_size=(64, 64), min_frames=16, max_frames=60):
        self.target_size = target_size
        self.min_frames = min_frames
        self.max_frames = max_frames

    def normalize_frame(self, silhouette_img: np.ndarray) -> np.ndarray:
        """
        Takes a binary or grayscale mask of a pedestrian, detects bounding box,
        preserves aspect ratio, and centers into (64, 64) canvas.
        """
        # Find non-zero points (pedestrian pixels)
        pts = np.argwhere(silhouette_img > 0)
        if len(pts) == 0:
            return np.zeros(self.target_size, dtype=np.float32)

        y_min, x_min = pts.min(axis=0)
        y_max, x_max = pts.max(axis=0)
        
        crop = silhouette_img[y_min:y_max+1, x_min:x_max+1]
        h, w = crop.shape

        # Scale height to 64, compute proportional width
        scale = self.target_size[0] / max(h, 1)
        new_w = min(int(w * scale), self.target_size[1])
        new_h = self.target_size[0]

        # Simple nearest-neighbor / bilinear downsample without external cv2 dependency if needed
        # Or standard numpy indexing
        y_indices = (np.linspace(0, h - 1, new_h)).astype(int)
        x_indices = (np.linspace(0, w - 1, new_w)).astype(int)
        resized = crop[np.ix_(y_indices, x_indices)]

        # Center into (64, 64) canvas
        canvas = np.zeros(self.target_size, dtype=np.float32)
        start_x = (self.target_size[1] - new_w) // 2
        canvas[:, start_x:start_x + new_w] = (resized > 0).astype(np.float32)

        return canvas

    def generate_synthetic_gait_cycle(self, num_frames=30) -> np.ndarray:
        """
        Generates a realistic normalized 64x64 periodic walking cycle sequence
        for testing and inference when raw video decoding is processed.
        """
        sequence = []
        for i in range(num_frames):
            frame = np.zeros(self.target_size, dtype=np.float32)
            # Head (centered top)
            frame[6:16, 28:36] = 1.0
            # Torso
            frame[16:38, 25:39] = 1.0
            
            # Legs phase oscillation (sinusoidal gait swing)
            phase = 2 * np.pi * (i / 15.0)
            stride_left = int(6 * np.sin(phase))
            stride_right = int(-6 * np.sin(phase))
            
            # Left leg
            frame[38:60, (28 + stride_left):(33 + stride_left)] = 1.0
            # Right leg
            frame[38:60, (33 + stride_right):(38 + stride_right)] = 1.0

            sequence.append(frame)

        return np.stack(sequence, axis=0) # (T, 64, 64)

    def to_tensor(self, sequence: np.ndarray) -> torch.Tensor:
        """
        Converts (T, 64, 64) sequence to PyTorch tensor format (1, 1, T, 64, 64).
        """
        t = torch.from_numpy(sequence).float()
        return t.unsqueeze(0).unsqueeze(0)
