
import { useEffect, useState } from 'react'
import { projectAPI } from '../../utils/services/api.js'

export default function ProjectsWorkspace() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  async function loadProjects() {
    setLoading(true)
    setError('')

    try {
      const response = await projectAPI.getAll()
      setProjects(response.projects || [])
    } catch (err) {
      setError(err.message || 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  async function createProject(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await projectAPI.create({ name, description })
      setName('')
      setDescription('')
      setMessage('Project created successfully.')
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Could not create project.')
    } finally {
      setBusy(false)
    }
  }

  function startEditing(project) {
    setEditingId(project.id)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setError('')
    setMessage('')
  }

  async function saveEdit(id) {
    setBusy(true)
    setError('')

    try {
      await projectAPI.update(id, {
        name: editName,
        description: editDescription
      })

      setEditingId(null)
      setMessage('Project updated successfully.')
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Could not update project.')
    } finally {
      setBusy(false)
    }
  }

  async function removeProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This may affect associated datasets and detection records depending on your database constraints.`
    )

    if (!confirmed) return

    setBusy(true)
    setError('')

    try {
      await projectAPI.delete(project.id)
      setMessage('Project deleted successfully.')
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Could not delete project.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-400">
          Workspace management
        </p>
        <h2 className="mt-2 text-3xl font-bold">Projects</h2>
        <p className="mt-2 text-sm text-slate-400">
          Organize your computer vision experiments, datasets and detection sessions.
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
        onSubmit={createProject}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
      >
        <h3 className="text-lg font-bold">Create a project</h3>

        <div className="mt-4 grid gap-4">
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Project name"
            minLength={2}
            maxLength={150}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-400"
          />

          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Project description (optional)"
            rows={3}
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-400"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : '+ Create project'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Your projects</h3>
          <p className="mt-1 text-sm text-slate-500">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={loadProjects}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:border-orange-400 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Loading projects...
        </p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-lg font-semibold">No projects yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first project to organize your work.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map(project => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              {editingId === project.id ? (
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
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveEdit(project.id)}
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
                  <h4 className="text-lg font-bold">{project.name}</h4>

                  <p className="mt-2 min-h-10 text-sm text-slate-400">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-950 p-3">
                      <p className="text-2xl font-bold text-orange-400">
                        {project.dataset_count ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">Datasets</p>
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3">
                      <p className="text-2xl font-bold text-orange-400">
                        {project.detection_session_count ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">Detection sessions</p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(project)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold hover:border-orange-400"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeProject(project)}
                      className="rounded-lg border border-rose-400/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
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
