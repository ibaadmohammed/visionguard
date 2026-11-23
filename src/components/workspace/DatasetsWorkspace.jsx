
import { useEffect, useState } from 'react'
import { projectAPI, datasetAPI } from '../../utils/services/api.js'

const FORMATS = ['COCO', 'YOLO', 'VOC', 'CUSTOM']

export default function DatasetsWorkspace() {
  const [projects, setProjects] = useState([])
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageCount, setImageCount] = useState('0')
  const [annotationFormat, setAnnotationFormat] = useState('YOLO')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImageCount, setEditImageCount] = useState('0')
  const [editFormat, setEditFormat] = useState('YOLO')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [projectResponse, datasetResponse] = await Promise.all([
        projectAPI.getAll(),
        datasetAPI.getAll()
      ])

      const projectList = projectResponse.projects || []
      setProjects(projectList)
      setDatasets(datasetResponse.datasets || [])

      if (!projectId && projectList.length) {
        setProjectId(String(projectList[0].id))
      }
    } catch (err) {
      setError(err.message || 'Failed to load datasets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function createDataset(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await datasetAPI.create({
        projectId,
        name,
        description,
        imageCount: Number(imageCount),
        annotationFormat: annotationFormat || null
      })

      setName('')
      setDescription('')
      setImageCount('0')
      setMessage('Dataset created successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not create dataset.')
    } finally {
      setBusy(false)
    }
  }

  function startEditing(dataset) {
    setEditingId(dataset.id)
    setEditName(dataset.name)
    setEditDescription(dataset.description || '')
    setEditImageCount(String(dataset.image_count ?? 0))
    setEditFormat(dataset.annotation_format || '')
    setError('')
    setMessage('')
  }

  async function saveEdit(id) {
    setBusy(true)
    setError('')

    try {
      await datasetAPI.update(id, {
        name: editName,
        description: editDescription,
        imageCount: Number(editImageCount),
        annotationFormat: editFormat || null
      })

      setEditingId(null)
      setMessage('Dataset updated successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not update dataset.')
    } finally {
      setBusy(false)
    }
  }

  async function removeDataset(dataset) {
    if (!window.confirm(`Delete dataset "${dataset.name}"?`)) return

    setBusy(true)
    setError('')

    try {
      await datasetAPI.delete(dataset.id)
      setMessage('Dataset deleted successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not delete dataset.')
    } finally {
      setBusy(false)
    }
  }

  function getProjectName(id) {
    return projects.find(project => String(project.id) === String(id))?.name
      || 'Unknown project'
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-400">
          Dataset management
        </p>
        <h2 className="mt-2 text-3xl font-bold">Datasets</h2>
        <p className="mt-2 text-sm text-slate-400">
          Organize image collections and annotation formats inside your projects.
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
        onSubmit={createDataset}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
      >
        <h3 className="text-lg font-bold">Create a dataset</h3>

        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-amber-300">
            Create a project first before adding a dataset.
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            <select
              value={projectId}
              onChange={event => setProjectId(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="">Select project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Dataset name"
              minLength={2}
              maxLength={150}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
            />

            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Dataset description (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="1"
                value={imageCount}
                onChange={event => setImageCount(event.target.value)}
                placeholder="Image count"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              />

              <select
                value={annotationFormat}
                onChange={event => setAnnotationFormat(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
              >
                {FORMATS.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={busy || !projectId}
              className="w-fit rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {busy ? 'Please wait...' : '+ Create dataset'}
            </button>
          </div>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Your datasets</h3>
          <p className="mt-1 text-sm text-slate-500">
            {datasets.length} dataset{datasets.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-orange-400 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Loading datasets...
        </p>
      ) : datasets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-lg font-semibold">No datasets yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first dataset to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datasets.map(dataset => (
            <article
              key={dataset.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              {editingId === dataset.id ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={event => setEditName(event.target.value)}
                    minLength={2}
                    maxLength={150}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />

                  <textarea
                    value={editDescription}
                    onChange={event => setEditDescription(event.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editImageCount}
                    onChange={event => setEditImageCount(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />

                  <select
                    value={editFormat}
                    onChange={event => setEditFormat(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="">No format selected</option>
                    {FORMATS.map(format => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(dataset.id)}
                      className="rounded-lg bg-orange-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-lg font-bold">{dataset.name}</h4>

                  <p className="mt-2 text-sm text-slate-400">
                    {dataset.description || 'No description provided.'}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Project: {getProjectName(dataset.project_id)}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-950 p-3">
                      <p className="text-2xl font-bold text-orange-400">
                        {dataset.image_count ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">Images</p>
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3">
                      <p className="text-sm font-bold text-orange-400">
                        {dataset.annotation_format || 'Not specified'}
                      </p>
                      <p className="text-xs text-slate-500">Annotation format</p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(dataset)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold hover:border-orange-400"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeDataset(dataset)}
                      className="rounded-lg border border-rose-400/20 px-4 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
