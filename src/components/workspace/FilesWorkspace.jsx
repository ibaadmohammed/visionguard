
import { useEffect, useState } from 'react'
import {
  projectAPI,
  datasetAPI,
  uploadAPI
} from '../../utils/services/api.js'

function formatBytes(bytes) {
  const size = Number(bytes)

  if (!size) return '0 Bytes'
  if (size < 1024) return `${size} Bytes`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function FilesWorkspace() {
  const [projects, setProjects] = useState([])
  const [datasets, setDatasets] = useState([])
  const [files, setFiles] = useState([])

  const [projectId, setProjectId] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [projectResponse, datasetResponse, fileResponse] =
        await Promise.all([
          projectAPI.getAll(),
          datasetAPI.getAll(),
          uploadAPI.getAll()
        ])

      setProjects(projectResponse.projects || [])
      setDatasets(datasetResponse.datasets || [])
      setFiles(fileResponse.files || [])
    } catch (err) {
      setError(err.message || 'Failed to load uploaded files.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleUpload(event) {
    event.preventDefault()

    if (!selectedFile) {
      setError('Please select an image.')
      return
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('Image size must not exceed 15 MB.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()

      formData.append('image', selectedFile)

      if (projectId) {
        formData.append('projectId', projectId)
      }

      if (datasetId) {
        formData.append('datasetId', datasetId)
      }

      await uploadAPI.create(formData)

      setSelectedFile(null)
      setProjectId('')
      setDatasetId('')
      event.target.reset()

      setMessage('Image uploaded successfully.')

      await loadData()
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete "${file.original_name}"?`)) {
      return
    }

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await uploadAPI.delete(file.id)

      setFiles(previous =>
        previous.filter(item => item.id !== file.id)
      )

      setMessage('File deleted successfully.')
    } catch (err) {
      setError(err.message || 'Could not delete file.')
    } finally {
      setBusy(false)
    }
  }

  function getProjectName(id) {
    return projects.find(
      project => String(project.id) === String(id)
    )?.name || 'Unassigned'
  }

  function getDatasetName(id) {
    return datasets.find(
      dataset => String(dataset.id) === String(id)
    )?.name || 'Unassigned'
  }

  const availableDatasets = datasets.filter(
    dataset => String(dataset.project_id) === String(projectId)
  )

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-400">
          File management
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Uploaded Files
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Upload, organize and manage your computer vision images.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
      >
        <h3 className="text-lg font-bold">
          Upload an image
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          JPEG, PNG or WebP · Maximum file size: 15 MB
        </p>

        <div className="mt-5 space-y-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={event => {
              setSelectedFile(event.target.files?.[0] || null)
              setError('')
            }}
            className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
          />

          {selectedFile && (
            <p className="text-sm text-slate-400">
              Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={projectId}
              onChange={event => {
                setProjectId(event.target.value)
                setDatasetId('')
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="">No project association</option>

              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={datasetId}
              onChange={event => setDatasetId(event.target.value)}
              disabled={!projectId}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm disabled:opacity-50"
            >
              <option value="">No dataset association</option>

              {availableDatasets.map(dataset => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busy || !selectedFile}
            className="rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {busy ? 'Uploading...' : '+ Upload image'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">
            Your files
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {files.length} uploaded file{files.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || busy}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-orange-400 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Loading files...
        </p>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-lg font-semibold">
            No uploaded files yet
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Upload your first image to populate your library.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {files.map(file => (
            <article
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-xl">
                    🖼️
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate font-semibold">
                      {file.original_name}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      {file.mime_type} · {formatBytes(file.size_bytes)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    Project: {getProjectName(file.project_id)}
                  </span>

                  <span>
                    Dataset: {getDatasetName(file.dataset_id)}
                  </span>

                  <span>
                    {new Date(file.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => deleteFile(file)}
                className="rounded-lg border border-rose-400/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
