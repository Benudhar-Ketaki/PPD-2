import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.utils import response

def handler(event, context):
    return response(200, {
        "analysisId": "AN-9482",
        "status": "Completed",
        "trackId": "TR-091",
        "silhouettesExtracted": 64,
        "resolution": "64x64",
        "candidates": [
            {"rank": 1, "profileId": "GV-0104", "name": "Subject 104", "similarity": 94.2, "distance": 0.428},
            {"rank": 2, "profileId": "GV-0087", "name": "Subject 087", "similarity": 88.7, "distance": 0.582},
            {"rank": 3, "profileId": "GV-0062", "name": "Subject 062", "similarity": 72.1, "distance": 0.814}
        ]
    })
