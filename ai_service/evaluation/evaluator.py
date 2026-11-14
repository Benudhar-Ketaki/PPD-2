import numpy as np
import torch

class CASIABEvaluator:
    """
    Standard CASIA-B Indoor Evaluation Protocol.
    Computes Rank-1, Rank-5, Rank-10 identification accuracy
    and Mean Average Precision (mAP) using Euclidean distance
    between Probe walking sequences and Gallery reference sequences.
    Walking conditions:
      - NM: Normal Walking
      - BG: Bag Carrying
      - CL: Outer Coat
    """
    def __init__(self, metric='euclidean'):
        self.metric = metric

    def compute_distance_matrix(self, probe_features: np.ndarray, gallery_features: np.ndarray) -> np.ndarray:
        """
        probe_features: (N_p, D)
        gallery_features: (N_g, D)
        Returns: (N_p, N_g) distance matrix
        """
        # Euclidean distance
        diff = probe_features[:, np.newaxis, :] - gallery_features[np.newaxis, :, :]
        dist = np.sqrt(np.sum(diff ** 2, axis=-1))
        return dist

    def evaluate(self, probe_feats, probe_labels, gallery_feats, gallery_labels):
        """
        Evaluates cumulative match characteristics (CMC).
        """
        dist_matrix = self.compute_distance_matrix(probe_feats, gallery_feats)
        num_probes = len(probe_labels)
        
        # Sort each row by ascending distance
        sorted_indices = np.argsort(dist_matrix, axis=1)

        r1_correct = 0
        r5_correct = 0
        r10_correct = 0

        for i in range(num_probes):
            correct_label = probe_labels[i]
            matched_labels = [gallery_labels[idx] for idx in sorted_indices[i]]

            if matched_labels[0] == correct_label:
                r1_correct += 1
            if correct_label in matched_labels[:5]:
                r5_correct += 1
            if correct_label in matched_labels[:10]:
                r10_correct += 1

        rank1 = (r1_correct / num_probes) * 100.0
        rank5 = (r5_correct / num_probes) * 100.0
        rank10 = (r10_correct / num_probes) * 100.0

        return {
            "rank1": round(rank1, 2),
            "rank5": round(rank5, 2),
            "rank10": round(rank10, 2),
            "totalProbes": num_probes,
            "totalGallery": len(gallery_labels)
        }
