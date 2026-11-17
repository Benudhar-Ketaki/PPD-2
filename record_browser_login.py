"""
WalkTrace (GaitVision) — Automated Browser Login Flow Screen Recorder
Uses Chrome DevTools Protocol (CDP) to drive the live web frontend on http://localhost:5173,
recording a smooth, high-resolution 1080p video of the entire login journey:
1. Landing Page presentation
2. Animated cursor moving to "Sign In" button in Navbar
3. Login Modal popup with dark glassmorphism
4. Typing email and password
5. Authentication loading state (Authenticating with AWS Cognito...)
6. Seamless transition into the Authenticated Biometric Dashboard
7. Dashboard inspection and workspace overview
Outputs: walktrace_browser_login_flow.mp4
"""

import asyncio
import json
import urllib.request
import websockets
import base64
import subprocess
import os
import cv2
import numpy as np

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BROWSER_PATH = EDGE_PATH if os.path.exists(EDGE_PATH) else CHROME_PATH

OUTPUT_VIDEO = "walktrace_browser_login_flow.mp4"
VIEW_W, VIEW_H = 1600, 900
TARGET_W, TARGET_H = 1920, 1080
FPS = 25

class BrowserRecorder:
    def __init__(self):
        self.proc = None
        self.ws = None
        self.msg_id = 0
        self.frames = []
        self.cursor_pos = [VIEW_W // 2, VIEW_H // 2]
        self.is_clicking = False

    async def send_cmd(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params
        await self.ws.send(json.dumps(msg))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == self.msg_id:
                return resp.get("result", {})

    async def eval_js(self, expression):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        return res.get("result", {}).get("value")

    async def capture_frame(self):
        res = await self.send_cmd("Page.captureScreenshot", {
            "format": "jpeg",
            "quality": 88
        })
        img_bytes = base64.b64decode(res["data"])
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Draw a sleek simulated operating system cursor
        cx, cy = int(self.cursor_pos[0]), int(self.cursor_pos[1])
        if 0 <= cx < VIEW_W and 0 <= cy < VIEW_H:
            # Cursor shadow
            cv2.circle(img, (cx + 2, cy + 2), 12 if self.is_clicking else 6, (0, 0, 0), -1)
            # Outer ring
            ring_color = (0, 220, 255) if self.is_clicking else (0, 200, 240)
            cv2.circle(img, (cx, cy), 14 if self.is_clicking else 8, ring_color, 2)
            # Center pointer dot
            cv2.circle(img, (cx, cy), 4, (255, 255, 255), -1)

        # Scale to 1920x1080
        scaled = cv2.resize(img, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
        self.frames.append(scaled)

    async def smooth_move_cursor(self, target_x, target_y, duration_sec=0.8):
        steps = max(1, int(duration_sec * FPS))
        start_x, start_y = self.cursor_pos
        for s in range(1, steps + 1):
            t = s / float(steps)
            ease = 0.5 * (1.0 - np.cos(t * np.pi))
            self.cursor_pos[0] = start_x + (target_x - start_x) * ease
            self.cursor_pos[1] = start_y + (target_y - start_y) * ease
            await self.capture_frame()

    async def click_by_text(self, text, wait_after=0.5):
        box = await self.eval_js(f"""
            (() => {{
                const btns = Array.from(document.querySelectorAll('button, a'));
                const el = btns.find(b => b.textContent && b.textContent.toLowerCase().includes({json.dumps(text.lower())}));
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
        """)
        if box:
            await self.smooth_move_cursor(box["x"], box["y"], duration_sec=0.8)
            self.is_clicking = True
            for _ in range(4):
                await self.capture_frame()
            await self.eval_js(f"""
                (() => {{
                    const btns = Array.from(document.querySelectorAll('button, a'));
                    const el = btns.find(b => b.textContent && b.textContent.toLowerCase().includes({json.dumps(text.lower())}));
                    if (el) el.click();
                }})()
            """)
            self.is_clicking = False
            for _ in range(max(1, int(wait_after * FPS))):
                await self.capture_frame()
        else:
            print(f"[Warning] Text element not found: {text}")

    async def type_into_input(self, selector, text):
        box = await self.eval_js(f"""
            (() => {{
                const el = document.querySelector('{selector}');
                if (!el) return null;
                el.focus();
                const r = el.getBoundingClientRect();
                return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
        """)
        if box:
            await self.smooth_move_cursor(box["x"], box["y"], duration_sec=0.5)
            self.is_clicking = True
            await self.capture_frame()
            self.is_clicking = False

            cur_val = ""
            for char in text:
                cur_val += char
                await self.eval_js(f"""
                    (() => {{
                        const el = document.querySelector('{selector}');
                        if (el) {{
                            el.focus();
                            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                            setter.call(el, {json.dumps(cur_val)});
                            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        }}
                    }})()
                """)
                await self.capture_frame()
                await self.capture_frame()

    async def record_login_flow(self):
        print(f"[Recorder] Launching headless browser: {BROWSER_PATH}")
        temp_profile = os.path.join(os.environ.get("TEMP", "."), "walktrace_rec_profile")
        self.proc = subprocess.Popen([
            BROWSER_PATH,
            "--headless=new",
            "--remote-debugging-port=9222",
            f"--window-size={VIEW_W},{VIEW_H}",
            f"--user-data-dir={temp_profile}",
            "--disable-gpu",
            "--hide-scrollbars",
            "http://localhost:5173"
        ])

        await asyncio.sleep(2.5)

        with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
            tabs = json.loads(r.read())
            page_tab = next(t for t in tabs if t.get("type") == "page")
            ws_url = page_tab["webSocketDebuggerUrl"]

        print(f"[Recorder] Connected to CDP session: {ws_url}")
        self.ws = await websockets.connect(ws_url, max_size=25_000_000)

        await self.send_cmd("Page.enable")
        await self.send_cmd("DOM.enable")
        await self.send_cmd("Runtime.enable")

        # Clear session to start logged out
        await self.eval_js("localStorage.removeItem('gaitvision_user'); window.location.reload();")
        await asyncio.sleep(1.8)

        # -------------------------------------------------------------
        # STAGE 1: LANDING PAGE PRESENTATION (3.5s)
        # -------------------------------------------------------------
        print("[Recorder] Recording Stage 1: Landing Page...")
        self.cursor_pos = [VIEW_W // 2, VIEW_H // 3]
        for _ in range(40):
            await self.capture_frame()

        # Scroll down through features
        for sc in range(0, 300, 20):
            await self.eval_js(f"window.scrollTo(0, {sc})")
            await self.capture_frame()
        for _ in range(25):
            await self.capture_frame()

        # Scroll back up to Navbar
        for sc in range(300, -1, -25):
            await self.eval_js(f"window.scrollTo(0, {sc})")
            await self.capture_frame()
        for _ in range(20):
            await self.capture_frame()

        # -------------------------------------------------------------
        # STAGE 2: CLICK "SIGN IN" BUTTON IN NAVBAR
        # -------------------------------------------------------------
        print("[Recorder] Recording Stage 2: Moving cursor and clicking Sign In in Navbar...")
        await self.click_by_text("Sign In", wait_after=1.0)

        # -------------------------------------------------------------
        # STAGE 3: INPUT CREDENTIALS IN LOGIN MODAL
        # -------------------------------------------------------------
        print("[Recorder] Recording Stage 3: Entering Investigator Credentials...")
        await self.type_into_input("input[type='email']", "investigator.lead@walktrace.ai")
        for _ in range(12):
            await self.capture_frame()

        await self.type_into_input("input[type='password']", "GaitVision2026!#")
        for _ in range(15):
            await self.capture_frame()

        # -------------------------------------------------------------
        # STAGE 4: CLICK SIGN IN & AUTHENTICATING
        # -------------------------------------------------------------
        print("[Recorder] Recording Stage 4: Submitting Authentication & Loading...")
        await self.click_by_text("Demo Operator Fast Access", wait_after=0.6)

        # Record loading and transition
        for _ in range(30):
            await self.capture_frame()

        await asyncio.sleep(0.5)

        # -------------------------------------------------------------
        # STAGE 5: AUTHENTICATED GAIT ANALYSIS DASHBOARD (6s)
        # -------------------------------------------------------------
        print("[Recorder] Recording Stage 5: Authenticated Biometric Dashboard...")
        # Inspect user profile badge in top right
        await self.smooth_move_cursor(VIEW_W - 130, 40, duration_sec=1.0)
        for _ in range(30):
            await self.capture_frame()

        # Move to Video Ingestion dropzone
        dropzone = await self.eval_js("""
            (() => {
                const el = document.querySelector('.border-dashed') || document.querySelector('input[type=\"file\"]')?.parentElement;
                if (!el) return { x: 500, y: 400 };
                const r = el.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            })()
        """)
        if not dropzone or not isinstance(dropzone, dict):
            dropzone = {"x": 500, "y": 400}
        await self.smooth_move_cursor(dropzone.get("x", 500), dropzone.get("y", 400), duration_sec=1.2)
        for _ in range(35):
            await self.capture_frame()

        # Move to Model Selector (GaitBase-v1)
        model_el = await self.eval_js("""
            (() => {
                const el = document.querySelector('select');
                if (!el) return { x: 520, y: 550 };
                const r = el.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            })()
        """)
        if not model_el or not isinstance(model_el, dict):
            model_el = {"x": 520, "y": 550}
        await self.smooth_move_cursor(model_el.get("x", 520), model_el.get("y", 550), duration_sec=0.8)
        for _ in range(40):
            await self.capture_frame()

        print(f"[Recorder] Recording complete! Total frames captured: {len(self.frames)}")

    async def save_video(self):
        print(f"[Recorder] Encoding {len(self.frames)} frames into {OUTPUT_VIDEO} at {FPS} FPS...")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        vw = cv2.VideoWriter(OUTPUT_VIDEO, fourcc, float(FPS), (TARGET_W, TARGET_H))
        for f in self.frames:
            vw.write(f)
        vw.release()
        size_bytes = os.path.getsize(OUTPUT_VIDEO)
        print(f"[SUCCESS] Video rendered: {OUTPUT_VIDEO} ({size_bytes:,} bytes, {len(self.frames)/FPS:.1f}s)")

    def close(self):
        if self.proc:
            try:
                self.proc.terminate()
            except:
                pass

async def main():
    rec = BrowserRecorder()
    try:
        await rec.record_login_flow()
        await rec.save_video()
    finally:
        rec.close()

if __name__ == "__main__":
    asyncio.run(main())
