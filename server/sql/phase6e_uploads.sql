CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id
ON uploaded_files(user_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_project_id
ON uploaded_files(project_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_dataset_id
ON uploaded_files(dataset_id);