import json
import os
import sys

# Ensure common is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.utils import response

def handler(event, context):
    path = event.get("path", "")
    http_method = event.get("httpMethod", "GET")

    if path.endswith("/login") and http_method == "POST":
        try:
            body = json.loads(event.get("body", "{}"))
        except Exception:
            body = {}
        email = body.get("email", "operator@gaitvision.ai")
        role = body.get("role", "Investigator")
        return response(200, {
            "token": "jwt-gaitvision-demo-token",
            "user": {
                "email": email,
                "name": email.split("@")[0],
                "role": role,
                "status": "Authenticated"
            }
        })

    # Default /auth/me
    return response(200, {
        "email": "operator@gaitvision.ai",
        "name": "Forensic Operator",
        "role": "Investigator",
        "node": "AWS Lambda Serverless"
    })
