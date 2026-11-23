# VisionGuard — Multi-Model Computer Vision Laboratory

<p align="center">
  <strong>An AI-powered computer vision platform for real-time object detection, model evaluation, dataset management and analytics.</strong>
</p>

<p align="center">
  <a href="https://visionguard-six.vercel.app/">Live Demo</a> •
  <a href="https://github.com/ibaadmohammed/visionguard">GitHub Repository</a>
</p>

---

## Overview

**VisionGuard** is a full-stack computer vision platform designed to explore, perform and evaluate object detection using multiple AI models.

The platform provides an interactive environment for image, webcam and video-based detection, model benchmarking, detection history, project management, dataset organization, file uploads and personalized analytics.

VisionGuard combines a React-based frontend with an Express.js backend and PostgreSQL database to provide a structured workspace for computer vision experimentation.

## Features

### 1. Object Detection Laboratory
- Image-based object detection.
- Real-time webcam detection.
- Video-based object detection.
- Multiple computer vision model support.
- Object classification and confidence scores.
- Bounding-box visualization.
- Detection result analysis.

### 2. Multi-Model Evaluation
- Compare detection results across models.
- Analyze model inference time.
- Evaluate processing speed (FPS).
- Precision and recall evaluation.
- False-positive and false-negative analysis.
- Confidence threshold analysis.
- Dataset-based evaluation.
- Model performance leaderboard.

### 3. Authentication and User Management
- User registration and login.
- Authenticated user sessions.
- Protected backend API endpoints.
- User-specific workspace data.

### 4. Projects Workspace
- Create and manage projects.
- Organize computer vision experiments.
- Associate datasets and detection sessions with projects.

### 5. Dataset Management
- Create and manage datasets.
- Associate datasets with projects.
- Store dataset descriptions and image counts.
- Track annotation formats such as COCO, YOLO, VOC and CUSTOM.

### 6. Uploaded Files Management
- Upload image files.
- Associate uploads with projects and datasets.
- View uploaded file metadata.
- Delete uploaded files.
- File type and size validation.

### 7. Analytics Dashboard
- Total projects and datasets.
- Uploaded file statistics and storage usage.
- Total detection sessions and detections.
- Average inference time and FPS.
- Detection type breakdown.
- Most frequently detected object classes.
- Recent detection sessions.
- Recently uploaded files.

### 8. Detection History
- Store detection sessions in PostgreSQL.
- Review previous detection activity.
- View model and detection information.
- Track inference time and FPS.
- Delete detection history entries.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT-based authentication |
| Object Detection | YOLOv10s, COCO-SSD |
| Machine Learning Runtime | Transformers.js, ONNX Runtime |
| File Uploads | Multer |
| API Communication | REST API |
| Version Control | Git, GitHub |
| Deployment | Vercel, Render |

---

## System Architecture

```text
                  VISIONGUARD
                       |
          +------------+------------+
          |                         |
     React Frontend             Express Backend
       (Vite)                       |
          |                +--------+--------+
          |                |        |        |
          |             Auth     Detection  Upload
          |             Routes    Routes    Routes
          |                |        |        |
          +------------------------+
                           |
                      PostgreSQL
                           |
            +--------------+--------------+
            |              |              |
          Users          Projects       Datasets
            |              |              |
       Detection       Uploaded Files   Analytics
        Sessions
            |
      Detection Results
```

## Project Structure

```text
visionguard/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── auth/
│   │   └── workspace/
│   │       ├── DashboardWorkspace.jsx
│   │       ├── DatasetsWorkspace.jsx
│   │       ├── FilesWorkspace.jsx
│   │       └── ProjectWorkspace.jsx
│   │
│   ├── context/
│   │   └── AuthContext.jsx
│   │
│   ├── utils/
│   │   └── services/
│   │       ├── api.js
│   │       └── yolo.js
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── app.js
│   │
│   ├── sql/
│   │   ├── schema.sql
│   │   └── phase6e_uploads.sql
│   │
│   ├── uploads/
│   └── .env.example
│
├── package.json
└── README.md
```

## Installation and Setup

### Prerequisites

Make sure you have installed:

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

### 3. Install backend dependencies

```bash
cd server

npm install
```

### 4. Configure environment variables

Create your backend `.env` file using the provided example:

```bash
cp .env.example .env
```

Configure the required PostgreSQL connection details, authentication secrets and other environment variables according to `server/.env.example`.

**Important:** Never commit your actual `.env` file or database credentials to GitHub.

### 5. Configure PostgreSQL

Create a PostgreSQL database named:

```sql
CREATE DATABASE visionguard;
```

Execute the SQL schema and migration files in the appropriate order:

```text
server/sql/schema.sql
server/sql/phase6e_uploads.sql
```

Ensure the backend database connection points to your PostgreSQL database.

### 6. Start the backend

From the `server` directory:

```bash
npm run dev
```

The backend is configured to run on:

```text
http://localhost:5000
```

### 7. Start the frontend

Open another terminal in the project root:

```bash
npm run dev
```

The Vite development server is available at:

```text
http://localhost:5173
```

Open the frontend in your browser and register or log in to access the VisionGuard workspace.

---

## Application Workspaces

| Workspace | Purpose |
|---|---|
| Detection Lab | Image, webcam and video detection |
| Projects | Project organization |
| Datasets | Dataset management |
| Files | Uploaded image management |
| Dashboard | User analytics and statistics |

## API Overview

The backend exposes REST API endpoints for the application's core functionality.

| Endpoint | Purpose |
|---|---|
| `/api/auth` | Authentication |
| `/api/projects` | Project management |
| `/api/datasets` | Dataset management |
| `/api/uploads` | File upload management |
| `/api/detections` | Detection history |
| `/api/dashboard` | Dashboard analytics |

Protected endpoints require valid authentication.

## Deployment

VisionGuard uses separate frontend and backend deployments.

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** PostgreSQL

Live application:

https://visionguard-six.vercel.app/

Repository:

https://github.com/ibaadmohammed/visionguard

## Future Enhancements

- Advanced detection visualization and analytics.
- More object detection model integrations.
- Improved model benchmarking and comparison.
- Dataset annotation and preprocessing tools.
- Exportable evaluation reports.
- Enhanced security and automated testing.
- Docker-based development and deployment.
- Advanced user and project management.

## Author

**Mohammed Mohtashim Ibaad**

- GitHub: [@ibaadmohammed](https://github.com/ibaadmohammed)

---

<p align="center">
  <strong>VisionGuard — Explore. Detect. Evaluate. Analyze.</strong>
</p>
