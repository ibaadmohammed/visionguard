

import { useEffect, useRef, useState } from 'react'
import {
  createTrackerState,
  updateObjectTracks
} from '../utils/objectTracker'

export default function TrackingAnalytics({
  detections = [],
  frameKey = 0,
  videoWidth = 1280,
  videoHeight = 720,
  active = true
}) {
  const trackerRef = useRef(createTrackerState())
  const lastProcessedFrameRef = useRef(0)

  const [tracks, setTracks] = useState([])
  const [events, setEvents] = useState([])
  const [insideCount, setInsideCount] = useState(0)
  const [totalEntries, setTotalEntries] = useState(0)
  const [totalExits, setTotalExits] = useState(0)

  const [zone, setZone] = useState({
    x: 25,
    y: 20,
    width: 50,
    height: 60
  })

  useEffect(() => {
    if (!active || frameKey === 0) return

    // Prevent a zone adjustment from processing the same frame again.
    if (lastProcessedFrameRef.current === frameKey) return

    lastProcessedFrameRef.current = frameKey

    const result = updateObjectTracks(
      trackerRef.current,
      detections,
      videoWidth,
      videoHeight,
      zone
    )

    trackerRef.current = result.state

    setTracks(result.activeTracks)
    setEvents([...result.state.events].reverse())
    setInsideCount(result.insideCount)
    setTotalEntries(result.totalEntries)
    setTotalExits(result.totalExits)
  }, [
    frameKey,
    active,
    detections,
    videoWidth,
    videoHeight,
    zone
  ])

  function resetTracking() {
    trackerRef.current = createTrackerState()
    lastProcessedFrameRef.current = frameKey

    setTracks([])
    setEvents([])
    setInsideCount(0)
    setTotalEntries(0)
    setTotalExits(0)
  }

  function updateZone(key, value) {
    setZone(previous => {
      const next = { ...previous, [key]: value }

      next.x = Math.min(next.x, 100 - next.width)
      next.y = Math.min(next.y, 100 - next.height)
      next.width = Math.min(next.width, 100 - next.x)
      next.height = Math.min(next.height, 100 - next.y)

      return next
    })
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportJSON() {
    const report = {
      application: 'VisionGuard',
      phase: 'Phase 5C and 5D',
      generatedAt: new Date().toISOString(),
      zone,
      summary: {
        activeTracks: tracks.length,
        objectsInsideZone: insideCount,
        totalEntries,
        totalExits
      },
      tracks,
      events
    }

    downloadFile(
      JSON.stringify(report, null, 2),
      'visionguard-tracking-report.json',
      'application/json'
    )
  }

  function exportCSV() {
    const rows = [
      [
        'Event ID',
        'Track ID',
        'Class',
        'Event',
        'Time',
        'Dwell Seconds'
      ]
    ]

    events.forEach(event => {
      rows.push([
        event.id,
        event.trackId,
        event.class,
        event.type,
        event.time,
        event.dwellTimeSeconds ?? ''
      ])
    })

    const csv = rows
      .map(row =>
        row.map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      )
      .join('\n')

    downloadFile(
      csv,
      'visionguard-zone-events.csv',
      'text/csv'
    )
  }

  const classCounts = {}

  tracks.forEach(track => {
    classCounts[track.class] =
      (classCounts[track.class] || 0) + 1
  })

  const zoneControls = [
    { key: 'x', label: 'Horizontal position', max: 95 },
    { key: 'y', label: 'Vertical position', max: 95 },
    { key: 'width', label: 'Zone width', max: 100 },
    { key: 'height', label: 'Zone height', max: 100 }
  ]

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            Phase 05C + 05D
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Object tracking & smart zones
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Track persistent object IDs and monitor activity inside a virtual zone.
          </p>
        </div>

        <button
          type="button"
          onClick={resetTracking}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Reset tracking
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Active tracks</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">
            {tracks.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Zone occupancy</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {insideCount}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Total entries</p>
          <p className="mt-2 text-2xl font-bold text-orange-300">
            {totalEntries}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Total exits</p>
          <p className="mt-2 text-2xl font-bold text-rose-300">
            {totalExits}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-950 p-4">
        <h3 className="font-semibold">Smart zone configuration</h3>

        <p className="mt-1 text-xs text-slate-500">
          Adjust the virtual rectangle as a percentage of the video dimensions.
          An object's center point determines whether it is inside the zone.
        </p>

        {zoneControls.map(item => (
          <div key={item.key} className="mt-4">
            <div className="flex justify-between text-sm">
              <label className="text-slate-300">
                {item.label}
              </label>

              <span className="font-semibold text-orange-400">
                {zone[item.key]}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={item.max}
              step="1"
              value={zone[item.key]}
              onChange={event =>
                updateZone(item.key, Number(event.target.value))
              }
              className="mt-2 w-full accent-orange-400"
            />
          </div>
        ))}

        <div className="mt-4 rounded-lg border border-dashed border-orange-400/40 p-3">
          <p className="text-xs text-slate-400">
            Zone coordinates
          </p>

          <p className="mt-1 text-sm font-semibold text-orange-300">
            X: {zone.x}% · Y: {zone.y}% · Width: {zone.width}% · Height: {zone.height}%
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Active object tracking</h3>

        {tracks.length > 0 ? (
          <div className="mt-3 space-y-2">
            {tracks.map(track => (
              <div
                key={track.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-3"
              >
                <div>
                  <p className="font-semibold">
                    <span className="text-orange-400">
                      #{track.id}
                    </span>
                    {' '}
                    <span className="capitalize">
                      {track.class}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Seen for {track.age} matched frames
                    {' · '}
                    {(track.confidence * 100).toFixed(1)}% confidence
                  </p>
                </div>

                <span className={`rounded-lg px-3 py-2 text-xs ${
                  track.insideZone
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {track.insideZone ? 'Inside zone' : 'Outside zone'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-950 p-4 text-sm text-slate-500">
            Start detection to generate object tracking IDs.
          </p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Object class distribution</h3>

        {Object.keys(classCounts).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(classCounts).map(([name, count]) => (
              <span
                key={name}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <span className="capitalize">{name}</span>
                <span className="ml-2 font-bold text-orange-300">
                  {count}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No tracked objects yet.
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Zone event history</h3>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportJSON}
              className="rounded-lg bg-orange-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-orange-300"
            >
              Export JSON
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {events.length > 0 ? (
            events.map(event => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950 p-3 text-sm"
              >
                <div>
                  <span className={
                    event.type === 'ENTRY'
                      ? 'font-bold text-emerald-300'
                      : 'font-bold text-rose-300'
                  }>
                    {event.type}
                  </span>

                  <span className="ml-2 capitalize">
                    {event.class} #{event.trackId}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  {event.time}
                  {event.dwellTimeSeconds !== undefined &&
                    ` · ${event.dwellTimeSeconds}s dwell`}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-500">
              Zone entries and exits will appear here.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
