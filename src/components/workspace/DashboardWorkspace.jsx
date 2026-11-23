
import { useEffect, useState } from 'react'
import { dashboardAPI } from '../../utils/services/api.js'

const formatBytes = bytes => {
  const value = Number(bytes || 0)

  if (value === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  )

  return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
}

const formatDate = date =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

const StatCard = ({ label, value, detail, icon }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-400">{label}</p>
      <span className="text-xl">{icon}</span>
    </div>
    <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>
)

export default function DashboardWorkspace() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await dashboardAPI.getStats()

      if (!response.success) {
        throw new Error(response.message || 'Unable to load dashboard.')
      }

      setDashboard(response)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
        <p className="mt-4 text-slate-400">Loading your dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="font-semibold text-red-300">Dashboard Error</p>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const stats = dashboard?.stats || {}
  const projects = stats.projects || {}
  const datasets = stats.datasets || {}
  const files = stats.files || {}
  const detections = stats.detections || {}

  const detectionTypes = dashboard?.detectionTypes || []
  const topClasses = dashboard?.topClasses || []
  const recentSessions = dashboard?.recentSessions || []
  const recentFiles = dashboard?.recentFiles || []

  const maxTypeSessions = Math.max(
    1,
    ...detectionTypes.map(item => Number(item.sessions || 0))
  )

  const maxClassOccurrences = Math.max(
    1,
    ...topClasses.map(item => Number(item.occurrences || 0))
  )

  return (
    <div className="mx-auto max-w-7xl px-5 py-9">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            VisionGuard Analytics
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Your computer vision workspace at a glance.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          ↻ Refresh
        </button>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={Number(projects.total_projects || 0).toLocaleString()}
          detail="Total created projects"
          icon="📁"
        />

        <StatCard
          label="Datasets"
          value={Number(datasets.total_datasets || 0).toLocaleString()}
          detail={`${Number(datasets.dataset_images || 0).toLocaleString()} dataset images`}
          icon="🗂️"
        />

        <StatCard
          label="Uploaded Files"
          value={Number(files.total_files || 0).toLocaleString()}
          detail={formatBytes(files.storage_bytes)}
          icon="🖼️"
        />

        <StatCard
          label="Detection Sessions"
          value={Number(detections.total_sessions || 0).toLocaleString()}
          detail={`${Number(detections.total_detections || 0).toLocaleString()} total detections`}
          icon="🎯"
        />
      </div>

      {/* PERFORMANCE */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">
          Detection Performance
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Average Inference Time"
            value={`${Number(detections.average_inference_ms || 0).toFixed(2)} ms`}
            detail="Across recorded detection sessions"
            icon="⚡"
          />

          <StatCard
            label="Average FPS"
            value={Number(detections.average_fps || 0).toFixed(2)}
            detail="Average recorded processing speed"
            icon="🚀"
          />
        </div>
      </section>

      {/* ANALYTICS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">
            Detection Type Breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Sessions grouped by detection mode.
          </p>

          {detectionTypes.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No detection data available yet.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {detectionTypes.map(item => (
                <div key={item.detection_type}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="capitalize text-slate-300">
                      {item.detection_type}
                    </span>
                    <span className="text-slate-400">
                      {item.sessions} sessions · {item.detections} detections
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(item.sessions || 0) / maxTypeSessions) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">
            Top Detected Classes
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Most frequently detected object categories.
          </p>

          {topClasses.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No detection results available yet.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {topClasses.map(item => (
                <div key={item.class_name}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="capitalize text-slate-300">
                      {item.class_name}
                    </span>
                    <span className="text-slate-400">
                      {item.occurrences} detections
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(item.occurrences || 0) / maxClassOccurrences) * 100
                        )}%`
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Average confidence: {
                      (Number(item.average_confidence || 0) * 100).toFixed(1)
                    }%
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* RECENT SESSIONS */}
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-bold text-white">Recent Detection Sessions</h2>

        {recentSessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No detection sessions recorded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Model</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Detections</th>
                  <th className="py-3 pr-4">Inference</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map(session => (
                  <tr key={session.id} className="border-b border-slate-800/70">
                    <td className="py-3 pr-4 font-medium text-white">
                      {session.model_name}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-300">
                      {session.detection_type}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {session.total_detections}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {Number(session.inference_time_ms || 0).toFixed(2)} ms
                    </td>
                    <td className="py-3 text-slate-400">
                      {formatDate(session.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECENT FILES */}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-bold text-white">Recently Uploaded Files</h2>

        {recentFiles.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No uploaded files yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentFiles.map(file => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {file.original_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {file.mime_type} · {formatDate(file.created_at)}
                  </p>
                </div>
                <span className="text-sm text-slate-400">
                  {formatBytes(file.size_bytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
