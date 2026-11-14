import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.utils import response

EVENTS = [
    {"id": "EV-2408", "time": "14:32:15", "camera": "CAM-01", "trackId": "TR-091", "profileId": "GV-0104", "similarity": 94.2, "status": "Review"},
    {"id": "EV-2407", "time": "14:29:40", "camera": "CAM-02", "trackId": "TR-089", "profileId": "GV-0087", "similarity": 88.7, "status": "Review"},
    {"id": "EV-2406", "time": "14:27:02", "camera": "CAM-03", "trackId": "TR-086", "profileId": "Unknown", "similarity": 61.4, "status": "Unmatched"},
    {"id": "EV-2405", "time": "14:15:22", "camera": "CAM-04", "trackId": "TR-082", "profileId": "GV-0062", "similarity": 91.5, "status": "Verified"},
]

def handler(event, context):
    return response(200, {"events": EVENTS, "total": len(EVENTS)})
