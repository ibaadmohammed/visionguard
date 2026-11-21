

# VisionGuard 🛡️

### AI-Powered Multi-Model Object Detection & Benchmarking Platform

VisionGuard is a browser-based computer vision application that uses multiple deep learning models to detect and analyze objects in images. It combines YOLOv10s and TensorFlow.js COCO-SSD to provide an interactive object detection experience with confidence filtering, visual annotations, detection analytics, and model benchmarking.

# VisionGuard

A browser-based multi-model computer-vision laboratory built with React and Vite. VisionGuard supports YOLOv10s and COCO-SSD object detection, single-image benchmarking, manual ground-truth annotation, and dataset-level model evaluation.
e58be05 (Document Phase 4 dataset evaluation features)

The project aims to explore modern computer vision techniques, multi-model inference, and quantitative evaluation through a practical React application.

---

## ✨ Features

### 🤖 Multi-Model Object Detection

- **YOLOv10s:** Advanced object detection using Hugging Face Transformers.js.
- **COCO-SSD:** Real-time-capable object detection using TensorFlow.js.
- Switch between detection engines.
- Lazy-load models when needed.
- WebGPU acceleration with WASM fallback for YOLO inference, where supported.
- WebGL or CPU backend fallback for COCO-SSD.

### 📊 Advanced Detection Analytics

- Adjustable confidence threshold.
- Object class filtering.
- Detected object counts.
- Inference time measurement.
- Bounding-box visualization.
- Organized detection results.

### 🎯 Annotation & Model Benchmarking

- Draw ground-truth bounding boxes.
- Assign class labels to annotated objects.
- Compare detection models against manually annotated ground truth.
- Evaluate model predictions using benchmark metrics.
- Export benchmark results for further analysis.

### 📥 Export & Reporting

- Download annotated detection images as PNG.
- Export detection reports in JSON format.
- Export benchmark results for analysis.

---

## 🧰 Tech Stack

| Technology                   | Purpose                           |
| ---------------------------- | --------------------------------- |
| React                        | Frontend application              |
| Vite                         | Development server and build tool |
| JavaScript                   | Application logic                 |
| Tailwind CSS                 | User interface styling            |
| TensorFlow.js                | Browser-based machine learning    |
| COCO-SSD                     | Object detection model            |
| Hugging Face Transformers.js | Model inference                   |
| YOLOv10s                     | Advanced object detection         |
| ONNX Runtime                 | Model execution backend           |

---

## 🧠 Detection Models

### 1. YOLOv10s

Uses the `onnx-community/yolov10s` model through Hugging Face Transformers.js.

Designed for advanced object detection with browser-based inference.

### 2. COCO-SSD MobileNet V2

Uses TensorFlow.js and the COCO-SSD model.

Provides a second detection engine for comparing model outputs.

Both models have different architectures and performance characteristics. Actual detection quality depends on image quality, object size, lighting, occlusion, and confidence settings.

---

## 🏗️ Project Structure

```text
VisionGuard/
│
├── public/
│
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── postcss.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- A modern web browser

### 1. Clone the repository

```bash
git clone https://github.com/ibaadmohammed/visionguard.git
```

### 2. Navigate into the project

```bash
cd visionguard
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

<<<<<<< HEAD

### 5. Build for production

Open the local URL printed by Vite. Model weights are downloaded on first use, so an internet connection is required.

## Phase 4: Dataset evaluation

1. Open **Dataset evaluation** and upload JPG, PNG, or WebP images (up to 100 images; 20 MB per image).
2. Import matching ground-truth annotations:
   - **COCO JSON:** select an instances JSON file containing `images`, `annotations`, and `categories`. Image filenames are matched by basename. COCO pixel `xywh` boxes are scaled to the uploaded image dimensions when necessary.
   - **YOLO TXT:** select one `.txt` label file per image. Each row must use `class_id x_center y_center width height` with normalized coordinates. Paste class names in class-ID order; if omitted, labels are named `class_0`, `class_1`, etc.
3. Check the annotation status shown under each dataset image. Every image must have a matching annotation record/file. A matched image with an empty annotation list is treated as a valid negative image.
4. Run **YOLOv10s + COCO-SSD Dataset Evaluation**. Both models process each image independently. A model failure on one image is recorded and does not stop the rest of the dataset.
5. Review the dashboard and export JSON or CSV reports.

### Evaluation definitions

- Bounding boxes use `[x, y, width, height]` in original image pixels.
- TP, FP, FN, precision, recall and F1 use class-aware one-to-one matching at IoU 0.50.
- AP uses 101-point interpolated precision-recall. mAP@50 averages AP at IoU 0.50 across classes with ground-truth instances.
- mAP@50:95 averages AP at IoU thresholds 0.50, 0.55, …, 0.95.
- Predictions are evaluated at a low fixed confidence threshold (0.001) so the single-image confidence slider does not silently alter dataset metrics.
- Class names must be consistent between the annotations and the model labels. Metrics are only as reliable as the supplied ground truth.

## Production build

e58be05 (Document Phase 4 dataset evaluation features)

```bash
npm run build
```

Vite generates the production build inside the `dist/` directory.

## <<<<<<< HEAD

## 📖 How It Works

1. Upload an image into VisionGuard.
2. Select the preferred detection model.
3. Load the model and run inference.
4. View detected objects and bounding boxes.
5. Adjust confidence thresholds and class filters.
6. Analyze detection counts and inference performance.
7. Create ground-truth annotations for benchmarking.
8. Export detection results and reports.

---

## 🗺️ Development Roadmap

| Phase    | Milestone                                | Status         |
| -------- | ---------------------------------------- | -------------- |
| Phase 1  | Core Object Detection & Analytics        | ✅ Implemented |
| Phase 2  | YOLOv10s Detection Engine                | ✅ Implemented |
| Phase 2B | Multi-Model Detection                    | ✅ Implemented |
| Phase 3  | Advanced Detection Analytics             | ✅ Implemented |
| Phase 3B | Ground-Truth Annotation & Benchmarking   | ✅ Implemented |
| Phase 4  | Dataset-Based Evaluation                 | 🔜 Planned     |
| Phase 5  | Custom Object Detection & Model Training | 🔜 Planned     |
| Phase 6  | Real-Time Webcam Detection               | 🔜 Planned     |
| Phase 7  | Production-Ready VisionGuard Dashboard   | 🔜 Planned     |

---

## 🔬 Future Improvements

- Dataset-level model evaluation.
- Precision, recall, F1-score, and mAP evaluation.
- Custom dataset support.
- Custom object detection models.
- Real-time webcam inference.
- Performance optimization and model caching.
- Advanced visualization and analytics dashboard.

---

## 🎯 Project Objectives

VisionGuard is being developed to explore:

- Deep learning and computer vision.
- Object detection architectures.
- Multi-model inference.
- Browser-based machine learning.
- Model performance benchmarking.
- Frontend integration with AI/ML systems.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Commit your changes.
5. Open a Pull Request.

---

## 👨‍💻 Author

**Mohammed Mohtashim Ibaad**

IT Student | Software Developer | AI & ML Enthusiast

- GitHub: [@ibaadmohammed](https://github.com/ibaadmohammed)
- Project Repository: [VisionGuard](https://github.com/ibaadmohammed/visionguard)

---

## 📄 License

This project is currently under development. A license has not yet been specified.

---

<p align="center">
  <b>VisionGuard — Making Computer Vision More Accessible Through AI.</b>
</p>

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Select the **Vite** framework preset.
4. Use `npm run build` as the build command and `dist` as the output directory.

No application API keys are required.
e58be05 (Document Phase 4 dataset evaluation features)
