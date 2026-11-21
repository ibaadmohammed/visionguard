
import { useEffect, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import { pipeline } from '@huggingface/transformers'
import TrackingAnalytics from './TrackingAnalytics'

const YOLO_MODEL_ID = 'onnx-community/yolov10s'

export default function LiveDetection() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animationRef = useRef(null)
  const yoloRef = useRef(null)
  const cocoRef = useRef(null)
  const busyRef = useRef(false)
  const thresholdRef = useRef(50)

  const [selectedModel, setSelectedModel] = useState('yolo')
  const [threshold, setThreshold] = useState(50)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Camera is stopped')
  const [error, setError] = useState('')
  const [fps, setFps] = useState(0)
  const [inferenceTime, setInferenceTime] = useState(0)
  const [detections, setDetections] = useState([])
  const [classCounts, setClassCounts] = useState({})
  const [trackingFrame, setTrackingFrame] = useState(0)
  const [trackingSession, setTrackingSession] = useState(0)

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  async function loadYolo() {
    if (yoloRef.current) return yoloRef.current

    setStatus('Loading YOLOv10s...')

    let detector

    try {
      if (navigator.gpu) {
        try {
          detector = await pipeline(
            'object-detection',
            YOLO_MODEL_ID,
            { device: 'webgpu' }
          )
        } catch (webgpuError) {
          console.warn('WebGPU unavailable. Falling back to WASM.', webgpuError)
        }
      }

      if (!detector) {
        detector = await pipeline(
          'object-detection',
          YOLO_MODEL_ID,
          { device: 'wasm' }
        )
      }

      yoloRef.current = detector
      return detector
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

  function normalizeYolo(results) {
    return results.map(item => {
      const box = item.box || {}

      const xmin = Number(box.xmin)
      const ymin = Number(box.ymin)
      const xmax = Number(box.xmax)
      const ymax = Number(box.ymax)

      return {
        class: String(item.label || '').trim().toLowerCase(),
        score: Number(item.score),
        bbox: [
          xmin,
          ymin,
          xmax - xmin,
          ymax - ymin
        ]
      }
    }).filter(item =>
      item.class &&
      Number.isFinite(item.score) &&
      item.bbox.every(Number.isFinite) &&
      item.bbox[2] > 0 &&
      item.bbox[3] > 0
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

      const label =
        `${item.class} ${Math.round(item.score * 100)}%`

      ctx.lineWidth = Math.max(2, width / 400)
      ctx.strokeStyle = '#fb923c'
      ctx.fillStyle = '#fb923c'

      ctx.strokeRect(x, y, w, h)

      const fontSize = Math.max(14, width / 65)
      ctx.font = `bold ${fontSize}px sans-serif`

      const textWidth = ctx.measureText(label).width
      const labelHeight = fontSize + 10
      const labelY = Math.max(0, y - labelHeight)

      ctx.fillRect(
        x,
        labelY,
        textWidth + 12,
        labelHeight
      )

      ctx.fillStyle = '#111827'
      ctx.fillText(
        label,
        x + 6,
        labelY + fontSize
      )
    })
  }

  async function startCamera() {
    try {
      setError('')
      setLoading(true)

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is unavailable. Use HTTPS or localhost and a supported browser.'
        )
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRef.current = stream

      const video = videoRef.current
      video.srcObject = stream

      await video.play()

      setDetections([])
      setClassCounts({})
      setFps(0)
      setInferenceTime(0)
      setTrackingFrame(0)
      setTrackingSession(previous => previous + 1)
      setRunning(true)
      setStatus('Camera started')
    } catch (err) {
      setError(err?.message || 'Unable to start camera.')
      setStatus('Camera could not start')
      stopCamera()
    } finally {
      setLoading(false)
    }
  }

  function stopCamera() {
    setRunning(false)

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      )
    }

    busyRef.current = false
    setDetections([])
    setClassCounts({})
    setFps(0)
    setInferenceTime(0)
    setStatus('Camera is stopped')
  }

  useEffect(() => {
    if (!running) return

    let cancelled = false
    let frameCount = 0
    let lastFpsUpdate = performance.now()
    let lastInference = 0

    async function processFrame() {
      if (cancelled) return

      const video = videoRef.current

      if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        busyRef.current
      ) {
        animationRef.current = requestAnimationFrame(processFrame)
        return
      }

      // Limit inference frequency to avoid overloading the browser.
      const now = performance.now()

      if (now - lastInference < 100) {
        animationRef.current = requestAnimationFrame(processFrame)
        return
      }

      lastInference = now
      busyRef.current = true

      try {
        const start = performance.now()
        const confidence = thresholdRef.current / 100
        let results = []

        if (selectedModel === 'yolo') {
          const model = await loadYolo()

          const predictions = await model(video, {
            threshold: confidence,
            percentage: false
          })

          results = normalizeYolo(predictions)
        } else {
          const model = await loadCoco()

          const predictions = await model.detect(
            video,
            100,
            confidence
          )

          results = predictions.map(item => ({
            class: String(item.class || '').trim().toLowerCase(),
            score: Number(item.score),
            bbox: Array.isArray(item.bbox)
              ? item.bbox.map(Number)
              : []
          })).filter(item =>
            item.class &&
            Number.isFinite(item.score) &&
            item.bbox.length === 4 &&
            item.bbox.every(Number.isFinite)
          )
        }

        const elapsed = performance.now() - start

        if (cancelled) return

        drawDetections(
          results,
          video.videoWidth,
          video.videoHeight
        )

        setDetections(results)
        setTrackingFrame(previous => previous + 1)
        setInferenceTime(elapsed)

        const counts = {}

        results.forEach(item => {
          counts[item.class] = (counts[item.class] || 0) + 1
        })

        setClassCounts(counts)

        frameCount++

        const currentTime = performance.now()

        if (currentTime - lastFpsUpdate >= 1000) {
          setFps(
            Math.round(
              frameCount * 1000 / (currentTime - lastFpsUpdate)
            )
          )

          frameCount = 0
          lastFpsUpdate = currentTime
        }

        setStatus(
          `${selectedModel === 'yolo' ? 'YOLOv10s' : 'COCO-SSD'} running`
        )
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Live detection failed.')
          setStatus('Detection error')
        }
      } finally {
        busyRef.current = false

        if (!cancelled) {
          animationRef.current = requestAnimationFrame(processFrame)
        }
      }
    }

    async function initialize() {
      try {
        setLoading(true)
        setError('')

        if (selectedModel === 'yolo') {
          await loadYolo()
        } else {
          await loadCoco()
        }

        if (!cancelled) {
          setStatus('Live detection active')
          animationRef.current = requestAnimationFrame(processFrame)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Model initialization failed.')
          setStatus('Model loading failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initialize()

    return () => {
      cancelled = true

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      busyRef.current = false
    }
  }, [running, selectedModel])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
            Phase 05A · Real-time computer vision
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Live webcam detection
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Detect and monitor objects directly through your camera.
          </p>
        </div>

        <span className={`rounded-full px-3 py-2 text-xs ${
          running
            ? 'bg-emerald-400/10 text-emerald-300'
            : 'bg-slate-800 text-slate-400'
        }`}>
          ● {status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">
            Detection engine
          </label>

          <select
            value={selectedModel}
            disabled={running || loading}
            onChange={event => setSelectedModel(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-400 disabled:opacity-50"
          >
            <option value="yolo">YOLOv10s — ONNX Runtime</option>
            <option value="coco">COCO-SSD — MobileNet V2</option>
          </select>
        </div>

        <div>
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
            onChange={event => setThreshold(Number(event.target.value))}
            className="mt-4 w-full accent-orange-400"
          />
        </div>
      </div>

      <div className="relative mt-6 flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`block max-h-[600px] w-full object-contain ${
            running ? '' : 'hidden'
          }`}
        />

        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
            running ? '' : 'hidden'
          }`}
        />

        {!running && (
          <div className="p-8 text-center">
            <div className="text-5xl">📷</div>
            <p className="mt-4 font-semibold">
              Your webcam preview will appear here
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Allow camera permission to begin live detection.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={startCamera}
          disabled={running || loading}
          className="rounded-xl bg-orange-400 py-3 font-bold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading && !running ? 'Loading model...' : '▶ Start live detection'}
        </button>

        <button
          type="button"
          onClick={stopCamera}
          disabled={!running && !streamRef.current}
          className="rounded-xl border border-rose-400/40 py-3 font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ■ Stop camera
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Live FPS</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {fps}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Inference time</p>
          <p className="mt-2 text-2xl font-bold text-orange-300">
            {inferenceTime.toFixed(1)} ms
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Objects detected</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">
            {detections.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4">
          <p className="text-xs text-slate-400">Object classes</p>
          <p className="mt-2 text-2xl font-bold text-violet-300">
            {Object.keys(classCounts).length}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Live object counters</h3>

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
          <p className="mt-3 rounded-xl bg-slate-950 p-4 text-sm text-slate-500">
            No objects detected in the current frame.
          </p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Current frame detections</h3>

        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {detections.map((item, index) => (
            <div
              key={`${item.class}-${index}`}
              className="flex items-center justify-between rounded-lg bg-slate-950 p-3 text-sm"
            >
              <span className="capitalize">{item.class}</span>
              <span className="font-semibold text-emerald-300">
                {(item.score * 100).toFixed(1)}%
              </span>
            </div>
          ))}

          {!detections.length && (
            <p className="rounded-xl bg-slate-950 p-4 text-sm text-slate-500">
              Detection results will appear here.
            </p>
          )}
        </div>
      </div>
      <TrackingAnalytics
  key={trackingSession}
  detections={detections}
  frameKey={trackingFrame}
  videoWidth={videoRef.current?.videoWidth || 1280}
  videoHeight={videoRef.current?.videoHeight || 720}
  active={running}
/>
    </section>
  )
}
