

import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import {
  detectWithYolo,
  loadYoloModel
} from '../utils/services/yolo.js'
import TrackingAnalytics from './TrackingAnalytics'



export default function VideoDetection() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const videoUrlRef = useRef(null)
  const cocoRef = useRef(null)
  const stopRef = useRef(false)

  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [selectedModel, setSelectedModel] = useState('yolo')
  const [threshold, setThreshold] = useState(50)
  const [frameInterval, setFrameInterval] = useState(1)

  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedFrames, setProcessedFrames] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [averageInference, setAverageInference] = useState(0)
  const [analysisFps, setAnalysisFps] = useState(0)
  const [detections, setDetections] = useState([])
  const [trackingFrame, setTrackingFrame] = useState(0)
  const [analysisSession, setAnalysisSession] = useState(0)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Upload a video to begin')

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current)
      }
    }
  }, [])

  function handleVideoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.')
      event.target.value = ''
      return
    }

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current)
    }

    const url = URL.createObjectURL(file)
    videoUrlRef.current = url

    setVideoUrl(url)
    setVideoFile(file)
    setDuration(0)
    setProgress(0)
    setProcessedFrames(0)
    setTotalFrames(0)
    setAverageInference(0)
    setAnalysisFps(0)
    setDetections([])
    setTrackingFrame(0)
    setReport(null)
    setError('')
    setStatus('Loading video...')
  }

  async function loadYolo() {
  setStatus('Loading YOLOv10s...')

  try {
    await loadYoloModel()
    return true
  } catch (err) {
    throw new Error(
      `YOLOv10s failed to load: ${err?.message || 'Unknown error'}`
    )
  }
}

  async function loadCoco() {
    if (cocoRef.current) return cocoRef.current

    setStatus('Loading COCO-SSD...')

    try {
      try {
        await tf.setBackend('webgl')
        await tf.ready()
      } catch {
        await tf.setBackend('cpu')
        await tf.ready()
      }

      const model = await cocoSsd.load({
        base: 'mobilenet_v2'
      })

      cocoRef.current = model
      return model
    } catch (err) {
      throw new Error(
        `COCO-SSD failed to load: ${err?.message || 'Unknown error'}`
      )
    }
  }

 

  async function detectFrame(video) {
    const confidence = threshold / 100

   if (selectedModel === 'yolo') {
  await loadYolo()

  return await detectWithYolo(video, confidence)
}
    const model = await loadCoco()

    const predictions = await model.detect(
      video,
      100,
      confidence
    )

    return predictions.map(item => ({
      class: String(item.class || '').trim().toLowerCase(),
      score: Number(item.score),
      bbox: item.bbox.map(Number)
    })).filter(item =>
      item.class &&
      Number.isFinite(item.score) &&
      item.bbox.length === 4 &&
      item.bbox.every(Number.isFinite)
    )
  }

  function drawDetections(results, width, height) {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)

    results.forEach(item => {
      const [x, y, w, h] = item.bbox
      const label = `${item.class} ${Math.round(item.score * 100)}%`
      const fontSize = Math.max(14, width / 65)

      ctx.lineWidth = Math.max(2, width / 400)
      ctx.strokeStyle = '#fb923c'
      ctx.fillStyle = '#fb923c'
      ctx.strokeRect(x, y, w, h)

      ctx.font = `bold ${fontSize}px sans-serif`

      const textWidth = ctx.measureText(label).width
      const labelHeight = fontSize + 10
      const labelY = Math.max(0, y - labelHeight)

      ctx.fillRect(x, labelY, textWidth + 12, labelHeight)

      ctx.fillStyle = '#111827'
      ctx.fillText(label, x + 6, labelY + fontSize)
    })
  }

  function seekTo(video, time) {
    return new Promise((resolve, reject) => {
      if (Math.abs(video.currentTime - time) < 0.01) {
        resolve()
        return
      }

      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
        clearTimeout(timeout)
      }

      const onSeeked = () => {
        cleanup()
        resolve()
      }

      const onError = () => {
        cleanup()
        reject(new Error('Unable to load the requested video frame.'))
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Video frame loading timed out.'))
      }, 10000)

      video.addEventListener('seeked', onSeeked, { once: true })
      video.addEventListener('error', onError, { once: true })
      video.currentTime = time
    })
  }

  async function startAnalysis() {
    const video = videoRef.current

    if (!video || !videoFile || !duration || !video.videoWidth) {
      setError('Upload a video and wait for it to finish loading.')
      return
    }

    stopRef.current = false
    video.pause()

    setAnalyzing(true)
    setLoading(true)
    setError('')
    setReport(null)
    setProgress(0)
    setProcessedFrames(0)
    setTotalFrames(0)
    setAverageInference(0)
    setAnalysisFps(0)
    setDetections([])
    setTrackingFrame(0)
    setAnalysisSession(previous => previous + 1)
    setStatus('Preparing video analysis...')

    const startTime = performance.now()
    const inferenceTimes = []
    const frameResults = []

    try {
      if (selectedModel === 'yolo') {
        await loadYolo()
      } else {
        await loadCoco()
      }

      setLoading(false)

      const interval = Number(frameInterval)
      const timestamps = []

      for (let time = 0; time < duration; time += interval) {
        timestamps.push(Number(time.toFixed(2)))
      }

      if (timestamps.length === 0) {
        timestamps.push(0)
      }

      setTotalFrames(timestamps.length)
      setStatus('Analyzing video frames...')

      for (let index = 0; index < timestamps.length; index++) {
        if (stopRef.current) break

        await seekTo(video, timestamps[index])

        if (stopRef.current) break

        const inferenceStart = performance.now()
        const results = await detectFrame(video)
        const elapsed = performance.now() - inferenceStart

        if (stopRef.current) break

        inferenceTimes.push(elapsed)

        frameResults.push({
          frame: index + 1,
          timestamp: timestamps[index],
          inferenceTimeMs: Number(elapsed.toFixed(2)),
          objectCount: results.length,
          detections: results.map(item => ({
            class: item.class,
            confidence: Number(item.score.toFixed(4)),
            bbox: item.bbox.map(value => Number(value.toFixed(2)))
          }))
        })

        drawDetections(
          results,
          video.videoWidth,
          video.videoHeight
        )

        setDetections(results)
        setTrackingFrame(previous => previous + 1)
        setProcessedFrames(frameResults.length)

        setProgress(
          Math.round(
            (frameResults.length / timestamps.length) * 100
          )
        )

        setAverageInference(
          inferenceTimes.reduce((sum, value) => sum + value, 0) /
          inferenceTimes.length
        )

        setStatus(
          `Analyzing frame ${index + 1} of ${timestamps.length}`
        )
      }

      const totalTime = (performance.now() - startTime) / 1000
      const totalObjects = frameResults.reduce(
        (sum, frame) => sum + frame.objectCount,
        0
      )

      const completedReport = {
        application: 'VisionGuard',
        phase: 'Phase 5B, 5C and 5D',
        videoName: videoFile.name,
        videoSizeMB: Number(
          (videoFile.size / (1024 * 1024)).toFixed(2)
        ),
        videoDurationSeconds: Number(duration.toFixed(2)),
        model: selectedModel === 'yolo' ? 'YOLOv10s' : 'COCO-SSD',
        confidenceThreshold: threshold,
        frameIntervalSeconds: interval,
        totalFramesScheduled: timestamps.length,
        framesProcessed: frameResults.length,
        totalDetections: totalObjects,
        averageInferenceTimeMs: Number(
          (
            inferenceTimes.reduce((sum, value) => sum + value, 0) /
            (inferenceTimes.length || 1)
          ).toFixed(2)
        ),
        analysisDurationSeconds: Number(totalTime.toFixed(2)),
        analysisFPS: Number(
          (frameResults.length / (totalTime || 1)).toFixed(2)
        ),
        stoppedEarly: stopRef.current,
        frames: frameResults,
        generatedAt: new Date().toISOString()
      }

      setReport(completedReport)
      setAnalysisFps(completedReport.analysisFPS)

      setStatus(
        stopRef.current
          ? 'Analysis stopped'
          : 'Video analysis completed'
      )
    } catch (err) {
      setError(err?.message || 'Video analysis failed.')
      setStatus('Analysis failed')
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  function stopAnalysis() {
    stopRef.current = true
    setStatus('Stopping analysis...')
  }

  function downloadJSON() {
    if (!report) return

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: 'application/json' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'visionguard-video-report.json'
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadAnnotatedFrame() {
    const canvas = canvasRef.current

    if (!canvas || !canvas.width || !canvas.height) {
      setError('No annotated frame is available to export.')
      return
    }

    canvas.toBlob(blob => {
      if (!blob) {
        setError('Unable to export the annotated frame.')
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'visionguard-annotated-frame.png'
      link.click()

      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            Phase 05B · Video intelligence
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Video object detection
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Analyze video frames using AI detection and object tracking.
          </p>
        </div>

        <span className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300">
          ● {status}
        </span>
      </div>

      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={analyzing}
          className="w-full rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-orange-400 disabled:opacity-40"
        >
          <span className="text-3xl">🎬</span>

          <p className="mt-3 font-semibold">
            {videoFile ? videoFile.name : 'Choose a video file'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            MP4, WebM and other browser-supported video formats
          </p>
        </button>
      </div>

      {videoUrl && (
        <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-700 bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={event => {
              setDuration(event.currentTarget.duration)
              setStatus('Video ready for analysis')
            }}
            className="block max-h-[560px] w-full object-contain"
          />

          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        </div>
      )}

      {videoFile && duration > 0 && (
        <p className="mt-3 text-sm text-slate-400">
          Duration: {duration.toFixed(2)} seconds
          {' · '}
          Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">
            Detection engine
          </label>

          <select
            value={selectedModel}
            disabled={analyzing}
            onChange={event => setSelectedModel(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-400 disabled:opacity-50"
          >
            <option value="yolo">YOLOv10s — ONNX Runtime</option>
            <option value="coco">COCO-SSD — MobileNet V2</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">
            Frame sampling interval
          </label>

          <select
            value={frameInterval}
            disabled={analyzing}
            onChange={event => setFrameInterval(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-400 disabled:opacity-50"
          >
            <option value="0.5">Every 0.5 seconds</option>
            <option value="1">Every 1 second</option>
            <option value="2">Every 2 seconds</option>
            <option value="5">Every 5 seconds</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between">
          <label className="text-sm font-semibold">
            Confidence threshold
          </label>

          <span className="text-sm font-bold text-orange-400">
            {threshold}%
          </span>
        </div>

        <input
          type="range"
          min="5"
          max="95"
          step="5"
          value={threshold}
          disabled={analyzing}
          onChange={event => setThreshold(Number(event.target.value))}
          className="mt-3 w-full accent-orange-400"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startAnalysis}
          disabled={!videoFile || !duration || analyzing}
          className="flex-1 rounded-xl bg-orange-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Loading model...' : '▶ Analyze video'}
        </button>

        <button
          type="button"
          onClick={stopAnalysis}
          disabled={!analyzing}
          className="rounded-xl border border-rose-400/40 px-5 py-3 font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ■ Stop analysis
        </button>
      </div>

      {(analyzing || report) && (
        <div className="mt-6 rounded-xl bg-slate-950 p-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Analysis progress</span>
            <span className="text-orange-400">{progress}%</span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-orange-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {processedFrames} of {totalFrames} frames processed
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Frames processed</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">
            {processedFrames}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Latest detections</p>
          <p className="mt-2 text-2xl font-bold text-orange-300">
            {detections.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Avg. inference</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {averageInference.toFixed(1)} ms
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Analysis FPS</p>
          <p className="mt-2 text-2xl font-bold text-violet-300">
            {analysisFps.toFixed(2)}
          </p>
        </div>
      </div>

      {report && (
        <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <h3 className="font-semibold text-emerald-300">
            Video analysis report ready
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Processed {report.framesProcessed} frames and recorded{' '}
            {report.totalDetections} detections.
          </p>

          <button
            type="button"
            onClick={downloadJSON}
            className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300"
          >
            ↓ Export JSON report
          </button>

          <button
            type="button"
            onClick={downloadAnnotatedFrame}
            className="ml-2 mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            ↓ Export annotated PNG
          </button>
        </div>
      )}

      <TrackingAnalytics
        key={analysisSession}
        detections={detections}
        frameKey={trackingFrame}
        videoWidth={videoRef.current?.videoWidth || 1280}
        videoHeight={videoRef.current?.videoHeight || 720}
        active={true}
      />
    </section>
  )
}
