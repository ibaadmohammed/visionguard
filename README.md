# VisionGuard – AI-Powered Object Detection & Evaluation Platform

VisionGuard is a full-stack computer vision platform designed to detect, analyze, track and evaluate objects in images, videos and live webcam streams.

It integrates multiple object detection models, advanced evaluation metrics, dataset benchmarking and cross-model verification to provide a comprehensive environment for computer vision experimentation.

## 🚀 Key Features

### 1. AI Object Detection
- YOLOv10s object detection using Hugging Face Transformers.js.
- COCO-SSD object detection using TensorFlow.js.
- WebGPU acceleration with WASM fallback for YOLO.
- WebGL/CPU fallback for COCO-SSD.
- Adjustable confidence thresholds.
- Class-based detection filtering.
- Bounding-box visualization.
- Detection counts and inference-time measurements.

### 2. Image & Video Processing
- Upload and analyze images.
- Real-time webcam object detection.
- Video upload and frame-by-frame analysis.
- Configurable frame sampling.
- Live FPS and inference-time monitoring.
- Export annotated images as PNG.
- Export detection reports as JSON.

### 3. Object Tracking & Smart Zones
- Object tracking with stable tracking IDs.
- IoU and center-distance-based matching.
- Track path visualization.
- Missed-frame management.
- Smart zone entry and exit detection.
- Occupancy monitoring.
- Class distribution analytics.
- Event history and analytics exports.

### 4. Advanced AI Model Evaluation

VisionGuard includes an advanced evaluation framework for measuring and comparing object detection performance.

**Evaluation metrics:**
- Precision
- Recall
- F1-score
- Intersection over Union (IoU)
- Average Precision (AP)
- Mean Average Precision (mAP@0.5)
- mAP@0.5:0.95

**Advanced evaluation capabilities:**
- Confidence threshold optimization.
- Precision-focused and recall-focused recommendations.
- False-positive and false-negative analysis.
- Localization and classification error analysis.
- Cross-model verification between YOLOv10s and COCO-SSD.
- Difficult-condition evaluation.
- Dataset-level benchmarking.
- AI model performance leaderboard.

**Difficult testing conditions:**
- Low-light images
- Blurred images
- Occluded objects
- Crowded scenes
- Normal conditions

### 5. Backend & Database

VisionGuard includes an Express.js backend connected to PostgreSQL.

- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Protected API endpoints.
- Project and workspace management.
- Dataset management.
- Detection session history.
- Detection result storage.
- Image upload handling.
- File validation and metadata storage.
- API rate limiting.
- HTTP security headers.

### 6. Reports & Analytics
- Dataset evaluation dashboards.
- Cross-model comparison dashboards.
- Detection error inspection.
- Dataset benchmarking dashboards.
- Model performance leaderboard.
- JSON and CSV exports.
- Annotated image downloads.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Computer Vision | YOLOv10s, COCO-SSD |
| Machine Learning | Hugging Face Transformers.js, TensorFlow.js |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcryptjs |
| File Uploads | Multer, file-type |
| Image Processing | HTML Canvas |
| Version Control | Git, GitHub |
| Deployment | Vercel (frontend) |

## 🏗️ Project Architecture

```text
VisionGuard/
│
├── src/
│   ├── components/
│   │   ├── DatasetEvaluationDashboard.jsx
│   │   ├── CrossModelDashboard.jsx
│   │   ├── ConditionsAnalysisDashboard.jsx
│   │   ├── DatasetBenchmarkDashboard.jsx
│   │   ├── DetectionErrorInspector.jsx
│   │   ├── ModelLeaderBoard.jsx
│   │   ├── DatasetPreview.jsx
│   │   ├── LiveDetection.jsx
│   │   ├── VideoDetection.jsx
│   │   └── TrackingAnalytics.jsx
│   │
│   ├── evaluation/
│   │   ├── averagePrecision.js
│   │   ├── precisionRecall.js
│   │   ├── mapEvaluation.js
│   │   ├── matching.js
│   │   ├── iou.js
│   │   ├── confidenceAnalysis.js
│   │   ├── errorAnalysis.js
│   │   ├── crossModelVerification.js
│   │   ├── conditionAnalysis.js
│   │   ├── datasetBenchmark.js
│   │   ├── modelLeaderboard.js
│   │   └── datasetEvaluator.js
│   │
│   └── App.jsx
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── database/
│
├── public/
├── package.json
└── README.md
```

*The architecture above highlights the main application areas; additional project files and backend modules may exist.*

## ⚙️ Installation & Setup

### Prerequisites
- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ibaadmohammed/visionguard.git
cd visionguard
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Start the frontend

```bash
npm run dev
```

Vite will display the local development URL in your terminal.

### 4. Set up the backend

```bash
cd server
npm install
```

Configure the backend environment variables according to the server configuration. These include the PostgreSQL connection settings, JWT secret and server port.

Create the PostgreSQL database and configure the required schema before starting the backend.

Start the backend using the development script configured in `server/package.json`.

### 5. Build for production

From the project root:

```bash
npm run build
```

The production build is generated in the `dist/` directory.

## 📊 Model Comparison

VisionGuard supports two object detection models:

| Feature | YOLOv10s | COCO-SSD |
|---|---|---|
| Detection | Yes | Yes |
| Image inference | Yes | Yes |
| Webcam detection | Yes | Yes |
| Video analysis | Yes | Yes |
| Confidence filtering | Yes | Yes |
| Dataset evaluation | Yes | Yes |
| Performance comparison | Yes | Yes |

Model performance depends on the dataset, hardware, confidence threshold and testing conditions.

## 🎯 Project Objectives

- Build a browser-based computer vision platform.
- Compare different object detection architectures.
- Evaluate detection accuracy using established metrics.
- Identify false positives, false negatives and localization errors.
- Analyze model performance under difficult environmental conditions.
- Provide dataset-level evaluation and benchmarking.
- Integrate AI capabilities with a secure full-stack backend.

## 🔮 Future Enhancements

- Complete frontend authentication integration.
- Protected user dashboards.
- Persistent detection history.
- Project and dataset management interface.
- Cloud-based deployment and storage.
- Additional object detection models.
- Advanced visualization and analytics.
- Automated evaluation pipelines.

## 👨‍💻 Developer

**Mohammed Mohtashim Ibaad**

- GitHub: [@ibaadmohammed](https://github.com/ibaadmohammed)
- Project: [VisionGuard](https://github.com/ibaadmohammed/visionguard)

## 📄 License

This project is intended for educational, research and development purposes. Add an appropriate open-source license to the repository before distributing it under specific reuse permissions.

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Select the **Vite** framework preset.
4. Use `npm run build` as the build command and `dist` as the output directory.

No application API keys are required.
e58be05 (Document Phase 4 dataset evaluation features)
