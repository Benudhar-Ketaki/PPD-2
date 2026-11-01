# GaitID — Gait-Based Person Identification System

A modern, professional Streamlit web dashboard for gait-based biometric person identification using computer vision and deep learning on Windows CPU.

---

## 🌟 Key Highlights

- **Surveillance Biometric Pipeline**:
  1. **Pedestrian Detection & Tracking**: YOLOX-X + ByteTrack (99M parameters).
  2. **Human Silhouette Segmentation**: PaddleSeg PP-HumanSegV2 Mobile (192×192).
  3. **Deep Gait Feature Extraction**: OpenGait GREW GaitBase-DA (256-dimensional embeddings).
  4. **Biometric Similarity & Re-Identification**: Metric distance matching and identity prediction.
  5. **Annotated Video Rendering**: Overlays bounding boxes, subject IDs, and cross-camera recognition labels.
- **Hardware Profile**: Fully configured for **CPU inference** on AMD Ryzen 5 / Intel Core processors with 16 GB RAM.
- **Subprocess Isolation**: Dashboard executions run in isolated session directories (`dashboard/runs/run_<timestamp>`), preventing race conditions and preserving intermediate outputs.
- **Multi-Mode Execution**:
  - **Quick Verification Mode (15 frames)**: Runs in ~3 minutes for rapid in-class presentation / demonstration.
  - **Full Video Sequence Mode**: Processes the entire video for comprehensive biometric analysis.

---

## 📁 Project Directory Structure

```text
GAIT-Identification/
├── .venv/                              # Isolated Python 3.12 virtual environment (PyTorch CPU, PaddlePaddle, Streamlit)
├── dashboard/
│   ├── app.py                          # Streamlit Web Application interface
│   ├── runner.py                       # Safe subprocess bridge to OpenGait pipeline
│   └── runs/                           # Isolated per-run storage for uploads and results
├── All-in-One-Gait/
│   └── OpenGait/
│       ├── demo/
│       │   ├── checkpoints/            # Downloaded model weights (ByteTrack, OpenGait, PaddleSeg)
│       │   ├── libs/                   # Tracking, segmentation, and recognition engines
│       │   └── output/
│       │       └── InputVideos/        # Default repository test videos
│       ├── configs/                    # GaitBase YAML configurations
│       └── opengait/                   # Core OpenGait biometric framework
└── README.md
```

---

## 🚀 How to Start the Dashboard

### 1. Open PowerShell or Command Prompt
Navigate to the root project directory:
```powershell
cd "C:\Users\HP\Desktop\PPD-2\GAIT-Identification"
```

### 2. Launch Streamlit
Run the following command using the dedicated virtual environment:
```powershell
& ".\.venv\Scripts\streamlit.exe" run dashboard/app.py
```

### 3. Open in Browser
The dashboard will open automatically. If not, open your browser and navigate to:
👉 **`http://localhost:8501`**

---

## 🖥️ How to Use the Dashboard

1. **Upload Videos**:
   - **Gallery Video**: Reference footage containing known pedestrians.
   - **Probe Video**: Surveillance or query footage of pedestrians to recognize.
   *(Alternatively, click **"Load Pre-Split Self-Recognition Sample Videos"** to test immediately with the validated 5-second sample clip).*
2. **Select Mode (Sidebar)**:
   - Choose **Quick Verification (15 frames)** for live demonstrations (~3 minutes).
   - Choose **Full Video Sequence** for comprehensive processing.
3. **Click "Start Gait Recognition"**:
   - Real-time stage indicators and live diagnostic logs will display progress through detection, tracking, silhouette segmentation, feature extraction, and biometric comparison.
4. **Inspect Results**:
   - View the **Biometric Identification Results** table detailing Probe Person IDs, Matched Gallery IDs, and L2 distance metrics.
   - Watch the annotated video directly in the web player.
   - Click **Download Processed Video** to export the result MP4.

---

## 🛠️ Troubleshooting & Technical Notes

- **Streamlit Port Conflict**: If port 8501 is busy, specify another port:
  ```powershell
  & ".\.venv\Scripts\streamlit.exe" run dashboard/app.py --server.port 8502
  ```
- **CPU Speed Optimization**: Pedestrian detection using YOLOX-X processes ~4.5 to 5.0 seconds per frame on AMD Ryzen 5 CPU. For best interactive performance, use clips between 3 to 6 seconds in length.
- **Protobuf Stability**: The virtual environment uses `protobuf==3.20.2` to ensure PaddlePaddle C-bindings operate stably on Windows. Do not upgrade protobuf to v4/v5.

