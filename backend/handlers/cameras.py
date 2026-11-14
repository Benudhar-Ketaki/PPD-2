import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.utils import response

CAMERAS = [
    {"id": "CAM-01", "name": "Main Entrance Corridor", "status": "ONLINE", "location": "Gate Alpha", "fps": 30},
    {"id": "CAM-02", "name": "East Concourse Transit", "status": "ONLINE", "location": "Wing B Corridor", "fps": 30},
    {"id": "CAM-03", "name": "South Lobby Checkpoint", "status": "ONLINE", "location": "Central Lobby", "fps": 25},
    {"id": "CAM-04", "name": "West Maintenance Pathway", "status": "ONLINE", "location": "Facility Perimeter", "fps": 30},
    {"id": "CAM-05", "name": "North Parking Transit", "status": "ONLINE", "location": "Zone 4 Parking", "fps": 25},
    {"id": "CAM-06", "name": "Loading Bay Access", "status": "ONLINE", "location": "Service Gate 3", "fps": 30},
    {"id": "CAM-07", "name": "Terminal 2 Concourse", "status": "ONLINE", "location": "Public Atrium", "fps": 30},
    {"id": "CAM-08", "name": "Perimeter Fence Line", "status": "OFFLINE", "location": "External Perimeter", "fps": 0},
]

def handler(event, context):
    return response(200, {"cameras": CAMERAS, "total": len(CAMERAS)})
