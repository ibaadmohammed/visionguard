
-- =========================================
-- VISIONGUARD DATABASE SCHEMA
-- =========================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DATASETS
CREATE TABLE IF NOT EXISTS datasets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    image_count INTEGER NOT NULL DEFAULT 0
        CHECK (image_count >= 0),
    annotation_format VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DETECTION SESSIONS
CREATE TABLE IF NOT EXISTS detection_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    detection_type VARCHAR(30) NOT NULL
        CHECK (
            detection_type IN (
                'image',
                'webcam',
                'video',
                'dataset'
            )
        ),
    total_detections INTEGER NOT NULL DEFAULT 0
        CHECK (total_detections >= 0),
    inference_time_ms NUMERIC(12, 3),
    average_fps NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. DETECTION RESULTS
CREATE TABLE IF NOT EXISTS detection_results (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL
        REFERENCES detection_sessions(id) ON DELETE CASCADE,
    class_name VARCHAR(120) NOT NULL,
    confidence NUMERIC(7, 6) NOT NULL
        CHECK (confidence >= 0 AND confidence <= 1),
    x_min NUMERIC(12, 4),
    y_min NUMERIC(12, 4),
    x_max NUMERIC(12, 4),
    y_max NUMERIC(12, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_projects_user_id
    ON projects(user_id);

CREATE INDEX IF NOT EXISTS idx_datasets_project_id
    ON datasets(project_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON detection_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id
    ON detection_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at
    ON detection_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_results_session_id
    ON detection_results(session_id);

-- =========================================
-- SCHEMA VERSION
-- =========================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description)
VALUES (1, 'Initial VisionGuard database schema')
ON CONFLICT (version) DO NOTHING;
