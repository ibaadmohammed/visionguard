
const MAX_MISSED_FRAMES = 8
const MAX_PATH_LENGTH = 30
const MAX_EVENTS = 100

function getCenter(bbox) {
  const [x, y, width, height] = bbox
  return {
    x: x + width / 2,
    y: y + height / 2
  }
}

function calculateIoU(a, b) {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[0] + a[2], b[0] + b[2])
  const y2 = Math.min(a[1] + a[3], b[1] + b[3])

  const intersection =
    Math.max(0, x2 - x1) * Math.max(0, y2 - y1)

  const areaA = a[2] * a[3]
  const areaB = b[2] * b[3]
  const union = areaA + areaB - intersection

  return union > 0 ? intersection / union : 0
}

function distanceBetween(a, b, width, height) {
  const dx = (a.x - b.x) / Math.max(width, 1)
  const dy = (a.y - b.y) / Math.max(height, 1)
  return Math.sqrt(dx * dx + dy * dy)
}

function isInsideZone(center, zone, width, height) {
  const x = (center.x / Math.max(width, 1)) * 100
  const y = (center.y / Math.max(height, 1)) * 100

  return (
    x >= zone.x &&
    x <= zone.x + zone.width &&
    y >= zone.y &&
    y <= zone.y + zone.height
  )
}

export function createTrackerState() {
  return {
    tracks: [],
    nextId: 1,
    events: [],
    totalEntries: 0,
    totalExits: 0,
    frameNumber: 0
  }
}

export function updateObjectTracks(
  previousState,
  detections,
  width,
  height,
  zone,
  timestamp = Date.now()
) {
  const state = previousState || createTrackerState()

  const tracks = state.tracks.map(track => ({
    ...track,
    bbox: [...track.bbox],
    center: { ...track.center },
    path: [...track.path]
  }))

  const usedTracks = new Set()
  const usedDetections = new Set()
  const detectionTrackIds = new Map()
  const candidates = []

  // Find possible matches between existing tracks and new detections.
  tracks.forEach(track => {
    if (track.missed > MAX_MISSED_FRAMES) return

    detections.forEach((detection, index) => {
      if (track.class !== detection.class) return

      const center = getCenter(detection.bbox)
      const iou = calculateIoU(track.bbox, detection.bbox)
      const distance = distanceBetween(
        track.center,
        center,
        width,
        height
      )

      if (iou >= 0.05 || distance <= 0.12) {
        candidates.push({
          trackId: track.id,
          detectionIndex: index,
          score: iou + Math.max(0, 0.12 - distance)
        })
      }
    })
  })

  // Greedy one-to-one matching.
  candidates.sort((a, b) => b.score - a.score)

  candidates.forEach(candidate => {
    if (
      usedTracks.has(candidate.trackId) ||
      usedDetections.has(candidate.detectionIndex)
    ) {
      return
    }

    usedTracks.add(candidate.trackId)
    usedDetections.add(candidate.detectionIndex)

    detectionTrackIds.set(
      candidate.detectionIndex,
      candidate.trackId
    )
  })

  // Update existing tracks.
  const updatedTracks = tracks.map(track => {
    const detectionIndex = [...detectionTrackIds.entries()]
      .find(([, id]) => id === track.id)?.[0]

    if (detectionIndex === undefined) {
      return {
        ...track,
        missed: track.missed + 1,
        active: track.missed + 1 <= MAX_MISSED_FRAMES
      }
    }

    const detection = detections[detectionIndex]
    const center = getCenter(detection.bbox)
    const inside = isInsideZone(center, zone, width, height)

    const updated = {
      ...track,
      bbox: [...detection.bbox],
      center,
      confidence: detection.score,
      lastSeen: timestamp,
      missed: 0,
      active: true,
      age: track.age + 1,
      path: [
        ...track.path,
        { x: center.x, y: center.y }
      ].slice(-MAX_PATH_LENGTH)
    }

    if (inside && !track.insideZone) {
      updated.zoneEnteredAt = timestamp
      state.totalEntries += 1

      state.events.push({
        id: `${track.id}-entry-${timestamp}`,
        trackId: track.id,
        class: track.class,
        type: 'ENTRY',
        timestamp,
        time: new Date(timestamp).toLocaleTimeString()
      })
    }

    if (!inside && track.insideZone) {
      const dwell = track.zoneEnteredAt
        ? (timestamp - track.zoneEnteredAt) / 1000
        : 0

      state.totalExits += 1

      state.events.push({
        id: `${track.id}-exit-${timestamp}`,
        trackId: track.id,
        class: track.class,
        type: 'EXIT',
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
        dwellTimeSeconds: Number(dwell.toFixed(2))
      })

      updated.zoneEnteredAt = null
    }

    updated.insideZone = inside
    return updated
  })

  // Create new tracks for detections that did not match an existing track.
  const newTracks = []

  detections.forEach((detection, index) => {
    if (usedDetections.has(index)) return

    const center = getCenter(detection.bbox)
    const inside = isInsideZone(center, zone, width, height)
    const id = state.nextId++

    const track = {
      id,
      class: detection.class,
      bbox: [...detection.bbox],
      center,
      confidence: detection.score,
      firstSeen: timestamp,
      lastSeen: timestamp,
      age: 1,
      missed: 0,
      active: true,
      path: [{ x: center.x, y: center.y }],
      insideZone: inside,
      zoneEnteredAt: inside ? timestamp : null
    }

    newTracks.push(track)
    detectionTrackIds.set(index, id)

    if (inside) {
      state.totalEntries += 1

      state.events.push({
        id: `${id}-entry-${timestamp}`,
        trackId: id,
        class: detection.class,
        type: 'ENTRY',
        timestamp,
        time: new Date(timestamp).toLocaleTimeString()
      })
    }
  })

  state.tracks = [
    ...updatedTracks.filter(
      track => track.missed <= MAX_MISSED_FRAMES
    ),
    ...newTracks
  ]

  state.events = state.events.slice(-MAX_EVENTS)
  state.frameNumber += 1

  const activeTracks = state.tracks.filter(track => track.active)

  return {
    state,
    detections: detections.map((detection, index) => ({
      ...detection,
      trackId: detectionTrackIds.get(index) ?? null
    })),
    activeTracks,
    insideCount: activeTracks.filter(track => track.insideZone).length,
    totalEntries: state.totalEntries,
    totalExits: state.totalExits
  }
}
