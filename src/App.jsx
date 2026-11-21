
import { useEffect, useMemo, useRef, useState } from 'react'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import { pipeline } from '@huggingface/transformers'
import DatasetUploader from './components/DatasetUploader'
import DatasetPreview from './components/DatasetPreview'
import AnnotationImporter from './components/AnnotationImporter'
import DatasetEvaluationDashboard from './components/DatasetEvaluationDashboard'
import { evaluateModelDataset } from './evaluation/datasetEvaluator'
import { exportDatasetCSV, exportDatasetJSON } from './utils/reportExporter'

const YOLO_MODEL_ID = 'onnx-community/yolov10s'
const IOU_THRESHOLD = 0.5

// --------------------------------------------------
// Detection helpers
// --------------------------------------------------

function normalizeYoloPredictions(predictions) {
  return predictions.map(prediction => {
    const box = prediction.box

    return {
      class: String(prediction.label).trim().toLowerCase(),
      score: prediction.score,
      bbox: [
        box.xmin,
        box.ymin,
        box.xmax - box.xmin,
        box.ymax - box.ymin
      ]
    }
  })
}

function calculateIoU(a, b) {
  const [ax, ay, aw, ah] = a.bbox
  const [bx, by, bw, bh] = b.bbox

  const left = Math.max(ax, bx)
  const top = Math.max(ay, by)
  const right = Math.min(ax + aw, bx + bw)
  const bottom = Math.min(ay + ah, by + bh)

  const intersection =
    Math.max(0, right - left) *
    Math.max(0, bottom - top)

  const areaA = Math.max(0, aw) * Math.max(0, ah)
  const areaB = Math.max(0, bw) * Math.max(0, bh)
  const union = areaA + areaB - intersection

  return union > 0 ? intersection / union : 0
}

function compareDetections(yolo, coco, iouThreshold = IOU_THRESHOLD) {
  const availableCoco = new Set(coco.map((_, index) => index))
  let matched = 0

  const sortedYolo = [...yolo].sort((a, b) => b.score - a.score)

  sortedYolo.forEach(yoloDetection => {
    let bestIndex = -1
    let bestIoU = 0

    availableCoco.forEach(index => {
      const cocoDetection = coco[index]

      if (yoloDetection.class !== cocoDetection.class) return

      const iou = calculateIoU(yoloDetection, cocoDetection)

      if (iou > bestIoU) {
        bestIoU = iou
        bestIndex = index
      }
    })

    if (bestIndex !== -1 && bestIoU >= iouThreshold) {
      matched++
      availableCoco.delete(bestIndex)
    }
  })

  const yoloOnly = yolo.length - matched
  const cocoOnly = coco.length - matched
  const total = yolo.length + coco.length

  return {
    matched,
    yoloOnly,
    cocoOnly,
    agreement: total ? (2 * matched / total) * 100 : 100
  }
}

// --------------------------------------------------
// Phase 3B — Ground-truth evaluation
// --------------------------------------------------

function calculateMetrics(
  predictions,
  groundTruth,
  iouThreshold = IOU_THRESHOLD
) {
  const classes = [...new Set(groundTruth.map(item => item.class))]

  const perClass = []
  let totalTP = 0
  let totalFP = 0
  let totalFN = 0

  for (const className of classes) {
    const actual = groundTruth.filter(item => item.class === className)

    const predicted = predictions
      .filter(item => item.class === className)
      .sort((a, b) => b.score - a.score)

    const matchedGroundTruth = new Set()
    const rankedResults = []

    let classTP = 0
    let classFP = 0

    for (const prediction of predicted) {
      let bestIndex = -1
      let bestIoU = 0

      actual.forEach((truth, index) => {
        if (matchedGroundTruth.has(index)) return

        const iou = calculateIoU(prediction, truth)

        if (iou > bestIoU) {
          bestIoU = iou
          bestIndex = index
        }
      })

      if (bestIndex !== -1 && bestIoU >= iouThreshold) {
        matchedGroundTruth.add(bestIndex)
        classTP++
        rankedResults.push(1)
      } else {
        classFP++
        rankedResults.push(0)
      }
    }

    const classFN = actual.length - classTP

    totalTP += classTP
    totalFP += classFP
    totalFN += classFN

    let cumulativeTP = 0
    let cumulativeFP = 0

    const precisionRecallPoints = []

    rankedResults.forEach(result => {
      if (result === 1) cumulativeTP++
      else cumulativeFP++

      precisionRecallPoints.push({
        recall: cumulativeTP / actual.length,
        precision: cumulativeTP /
          Math.max(1, cumulativeTP + cumulativeFP)
      })
    })

    let averagePrecision = 0

    for (let step = 0; step <= 100; step++) {
      const recallLevel = step / 100

      const eligible = precisionRecallPoints.filter(
        point => point.recall >= recallLevel
      )

      const bestPrecision = eligible.length
        ? Math.max(...eligible.map(point => point.precision))
        : 0

      averagePrecision += bestPrecision
    }

    averagePrecision /= 101

    perClass.push({
      class: className,
      groundTruth: actual.length,
      predictions: predicted.length,
      tp: classTP,
      fp: classFP,
      fn: classFN,
      ap: averagePrecision * 100
    })
  }

  const precision = totalTP + totalFP > 0
    ? totalTP / (totalTP + totalFP)
    : 0

  const recall = totalTP + totalFN > 0
    ? totalTP / (totalTP + totalFN)
    : 0

  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0

  const meanAP = perClass.length
    ? perClass.reduce((sum, item) => sum + item.ap, 0) / perClass.length
    : 0

  return {
    tp: totalTP,
    fp: totalFP,
    fn: totalFN,
    precision: precision * 100,
    recall: recall * 100,
    f1: f1 * 100,
    map50: meanAP,
    perClass
  }
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) /
    Math.max(1, values.length)
}

// --------------------------------------------------
// Main application
// --------------------------------------------------

function App() {
  const [selectedModel, setSelectedModel] = useState('yolo')
  const [modelStatus, setModelStatus] = useState(
    'YOLOv10s will load on first run'
  )

  const [busy, setBusy] = useState(false)
  const [benchmarkBusy, setBenchmarkBusy] = useState(false)

  const [imageUrl, setImageUrl] = useState('')
  const [imageReady, setImageReady] = useState(false)
  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0
  })

  // Phase 4 — Dataset state
  const [datasetImages, setDatasetImages] = useState([])
  const datasetImagesRef = useRef([])
  const [datasetBusy, setDatasetBusy] = useState(false)
  const [datasetProgress, setDatasetProgress] = useState({ completed: 0, total: 0, current: '' })
  const [datasetReport, setDatasetReport] = useState(null)
  const [datasetError, setDatasetError] = useState('')

  const [detections, setDetections] = useState([])
  const [error, setError] = useState('')
  const [threshold, setThreshold] = useState(50)
  const [selectedClass, setSelectedClass] = useState('all')
  const [inferenceTime, setInferenceTime] = useState(null)
  const [activeModelName, setActiveModelName] = useState('')

  // Phase 3A
  const [benchmark, setBenchmark] = useState(null)
  const [benchmarkError, setBenchmarkError] = useState('')

  // Phase 3B
  const [groundTruth, setGroundTruth] = useState([])
  const [annotationClass, setAnnotationClass] = useState('person')
  const [annotationMode, setAnnotationMode] = useState(false)
  const [draftBox, setDraftBox] = useState(null)
  const [annotationStart, setAnnotationStart] = useState(null)

  const imageRef = useRef(null)
  const canvasRef = useRef(null)
  const groundTruthCanvasRef = useRef(null)
  const inputRef = useRef(null)

  const cocoModelRef = useRef(null)
  const yoloDetectorRef = useRef(null)

  const cocoLoadingRef = useRef(null)
  const yoloLoadingRef = useRef(null)

  // --------------------------------------------------
  // Model loading
  // --------------------------------------------------

  async function ensureYoloLoaded() {
    if (yoloDetectorRef.current) return yoloDetectorRef.current
    if (yoloLoadingRef.current) return yoloLoadingRef.current

    const loadingTask = (async () => {
      setModelStatus('Downloading YOLOv10s model...')

      let detector

      if (navigator.gpu) {
        try {
          setModelStatus('Initializing YOLOv10s with WebGPU...')

          detector = await pipeline(
            'object-detection',
            YOLO_MODEL_ID,
            { device: 'webgpu' }
          )
        } catch (webgpuError) {
          console.warn('WebGPU unavailable. Falling back to WASM:', webgpuError)
        }
      }

      if (!detector) {
        setModelStatus('Loading YOLOv10s with WASM...')

        detector = await pipeline('object-detection', YOLO_MODEL_ID)
      }

      yoloDetectorRef.current = detector
      setModelStatus('YOLOv10s ready')

      return detector
    })()

    yoloLoadingRef.current = loadingTask

    try {
      return await loadingTask
    } finally {
      yoloLoadingRef.current = null
    }
  }

  async function ensureCocoLoaded() {
    if (cocoModelRef.current) return cocoModelRef.current
    if (cocoLoadingRef.current) return cocoLoadingRef.current

    const loadingTask = (async () => {
      setModelStatus('Initializing TensorFlow.js...')

      try {
        const webglReady = await tf.setBackend('webgl')

        if (!webglReady) await tf.setBackend('cpu')
      } catch (webglError) {
        console.warn('WebGL unavailable:', webglError)
        await tf.setBackend('cpu')
      }

      await tf.ready()

      setModelStatus('Loading COCO-SSD MobileNet V2...')

      const model = await cocoSsd.load({
        base: 'mobilenet_v2'
      })

      cocoModelRef.current = model

      setModelStatus(
        `COCO-SSD ready · ${tf.getBackend().toUpperCase()}`
      )

      return model
    })()

    cocoLoadingRef.current = loadingTask

    try {
      return await loadingTask
    } finally {
      cocoLoadingRef.current = null
    }
  }

  // --------------------------------------------------
  // Image and dataset URL cleanup
  // --------------------------------------------------

  useEffect(() => {
    if (!imageUrl) return

    return () => URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  useEffect(() => {
    datasetImagesRef.current = datasetImages
  }, [datasetImages])

  useEffect(() => {
    return () => {
      datasetImagesRef.current.forEach(image => {
        URL.revokeObjectURL(image.previewUrl)
      })
    }
  }, [])

  // --------------------------------------------------
  // Phase 4 — Dataset management
  // --------------------------------------------------

  function handleImagesAdded(newImages) {
    setDatasetReport(null)
    setDatasetImages(previous => [...previous, ...newImages])
  }

  function handleAnnotationsImported(updatedImages) {
    setDatasetImages(updatedImages)
    setDatasetReport(null)
    setDatasetError('')
  }

  function handleRemoveImage(id) {
    const removed = datasetImages.find(image => image.id === id)

    if (removed) {
      URL.revokeObjectURL(removed.previewUrl)
    }

    setDatasetImages(previous => previous.filter(image => image.id !== id))
    setDatasetReport(null)
  }

  function handleClearDataset() {
    datasetImages.forEach(image => {
      URL.revokeObjectURL(image.previewUrl)
    })

    setDatasetImages([])
    setDatasetReport(null)
    setDatasetError('')
  }

  // --------------------------------------------------
  // Detection filters
  // --------------------------------------------------

  const filteredDetections = useMemo(() => {
    return detections.filter(detection => {
      const confidenceMatch = detection.score >= threshold / 100

      const classMatch =
        selectedClass === 'all' ||
        detection.class === selectedClass

      return confidenceMatch && classMatch
    })
  }, [detections, threshold, selectedClass])

  const objectClasses = useMemo(() => {
    return [...new Set(detections.map(d => d.class))].sort()
  }, [detections])

  const classCounts = useMemo(() => {
    return filteredDetections.reduce((acc, detection) => {
      acc[detection.class] = (acc[detection.class] || 0) + 1
      return acc
    }, {})
  }, [filteredDetections])

  const uniqueObjects = Object.keys(classCounts).length

  // --------------------------------------------------
  // Phase 3A comparison
  // --------------------------------------------------

  const comparison = useMemo(() => {
    if (!benchmark) return null

    const yolo = benchmark.yolo.results.filter(
      item => item.score >= threshold / 100
    )

    const coco = benchmark.coco.results.filter(
      item => item.score >= threshold / 100
    )

    return compareDetections(yolo, coco)
  }, [benchmark, threshold])

  // --------------------------------------------------
  // Phase 3B metrics
  // --------------------------------------------------

  const yoloMetrics = useMemo(() => {
    if (!benchmark || !groundTruth.length) return null

    const predictions = benchmark.yolo.results.filter(
      item => item.score >= threshold / 100
    )

    return calculateMetrics(predictions, groundTruth)
  }, [benchmark, groundTruth, threshold])

  const cocoMetrics = useMemo(() => {
    if (!benchmark || !groundTruth.length) return null

    const predictions = benchmark.coco.results.filter(
      item => item.score >= threshold / 100
    )

    return calculateMetrics(predictions, groundTruth)
  }, [benchmark, groundTruth, threshold])

  // --------------------------------------------------
  // Draw prediction boxes
  // --------------------------------------------------

  function draw(results) {
    const img = imageRef.current
    const canvas = canvasRef.current

    if (!img || !canvas || !img.naturalWidth) return

    const width = img.clientWidth
    const height = img.clientHeight

    if (!width || !height) return

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const scaleX = width / img.naturalWidth
    const scaleY = height / img.naturalHeight

    ctx.lineWidth = 2
    ctx.font = 'bold 13px sans-serif'
    ctx.textBaseline = 'middle'

    results.forEach(result => {
      const [x, y, w, h] = result.bbox

      const bx = x * scaleX
      const by = y * scaleY
      const bw = w * scaleX
      const bh = h * scaleY

      const label =
        `${result.class} ${Math.round(result.score * 100)}%`

      const textWidth = ctx.measureText(label).width
      const labelY = Math.max(0, by - 25)

      ctx.strokeStyle = '#34d399'
      ctx.fillStyle = '#34d399'

      ctx.strokeRect(bx, by, bw, bh)
      ctx.fillRect(bx, labelY, textWidth + 14, 24)

      ctx.fillStyle = '#052e24'
      ctx.fillText(label, bx + 7, labelY + 12)
    })
  }

  // --------------------------------------------------
  // Draw ground-truth boxes
  // --------------------------------------------------

  function drawGroundTruth() {
    const img = imageRef.current
    const canvas = groundTruthCanvasRef.current

    if (!img || !canvas || !img.naturalWidth) return

    const width = img.clientWidth
    const height = img.clientHeight

    if (!width || !height) return

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const scaleX = width / img.naturalWidth
    const scaleY = height / img.naturalHeight

    ctx.lineWidth = 3
    ctx.font = 'bold 13px sans-serif'

    const boxes = draftBox ? [...groundTruth, draftBox] : groundTruth

    boxes.forEach(box => {
      const [x, y, w, h] = box.bbox

      const bx = x * scaleX
      const by = y * scaleY
      const bw = w * scaleX
      const bh = h * scaleY

      ctx.strokeStyle = '#60a5fa'
      ctx.fillStyle = 'rgba(96,165,250,0.12)'
      ctx.setLineDash([6, 4])

      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeRect(bx, by, bw, bh)

      ctx.setLineDash([])

      const label = `GT: ${box.class}`
      const textWidth = ctx.measureText(label).width

      ctx.fillStyle = '#60a5fa'
      ctx.fillRect(bx, Math.max(0, by - 23), textWidth + 12, 22)

      ctx.fillStyle = '#082f49'
      ctx.fillText(label, bx + 6, Math.max(11, by - 12))
    })
  }

  useEffect(() => {
    if (imageReady) draw(filteredDetections)
  }, [filteredDetections, imageReady, imageSize])

  useEffect(() => {
    if (imageReady) drawGroundTruth()
  }, [groundTruth, draftBox, imageReady, imageSize])

  // --------------------------------------------------
  // Ground-truth annotation interactions
  // --------------------------------------------------

  function getImageCoordinates(event) {
    const img = imageRef.current
    const rect = event.currentTarget.getBoundingClientRect()

    if (!img || !rect.width || !rect.height) return null

    const x = (event.clientX - rect.left) *
      (img.naturalWidth / rect.width)

    const y = (event.clientY - rect.top) *
      (img.naturalHeight / rect.height)

    return {
      x: Math.max(0, Math.min(img.naturalWidth, x)),
      y: Math.max(0, Math.min(img.naturalHeight, y))
    }
  }

  function startAnnotation(event) {
    if (!annotationMode || !annotationClass.trim()) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const point = getImageCoordinates(event)
    if (!point) return

    setAnnotationStart(point)

    setDraftBox({
      class: annotationClass.trim().toLowerCase(),
      score: 1,
      bbox: [point.x, point.y, 0, 0]
    })
  }

  function moveAnnotation(event) {
    if (!annotationMode || !annotationStart) return

    const point = getImageCoordinates(event)
    if (!point) return

    const x = Math.min(annotationStart.x, point.x)
    const y = Math.min(annotationStart.y, point.y)
    const width = Math.abs(point.x - annotationStart.x)
    const height = Math.abs(point.y - annotationStart.y)

    setDraftBox({
      class: annotationClass.trim().toLowerCase(),
      score: 1,
      bbox: [x, y, width, height]
    })
  }

  function finishAnnotation(event) {
    if (!annotationStart || !draftBox) return

    const point = getImageCoordinates(event)

    if (point) {
      const x = Math.min(annotationStart.x, point.x)
      const y = Math.min(annotationStart.y, point.y)
      const width = Math.abs(point.x - annotationStart.x)
      const height = Math.abs(point.y - annotationStart.y)

      if (width >= 4 && height >= 4) {
        setGroundTruth(previous => [
          ...previous,
          {
            id: crypto.randomUUID(),
            class: annotationClass.trim().toLowerCase(),
            score: 1,
            bbox: [x, y, width, height]
          }
        ])
      }
    }

    setAnnotationStart(null)
    setDraftBox(null)
  }

  function removeGroundTruth(id) {
    setGroundTruth(previous =>
      previous.filter(item => item.id !== id)
    )
  }

  function clearGroundTruth() {
    setGroundTruth([])
    setDraftBox(null)
    setAnnotationStart(null)
  }

  // --------------------------------------------------
  // Upload image
  // --------------------------------------------------

  function upload(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.')
      return
    }

    setError('')
    setDetections([])
    setInferenceTime(null)
    setActiveModelName('')
    setSelectedClass('all')
    setImageReady(false)
    setBenchmark(null)
    setBenchmarkError('')
    setGroundTruth([])
    setAnnotationMode(false)

    setImageSize({
      width: 0,
      height: 0
    })

    setImageUrl(URL.createObjectURL(file))
    event.target.value = ''
  }

  // --------------------------------------------------
  // Single-model detection
  // --------------------------------------------------

  async function detect() {
    if (!imageUrl || !imageReady || busy || datasetBusy) return

    setBusy(true)
    setError('')
    setDetections([])
    setInferenceTime(null)

    try {
      let results = []
      let elapsed = 0

      if (selectedModel === 'yolo') {
        const detector = await ensureYoloLoaded()
        const start = performance.now()

        const predictions = await detector(imageUrl, {
          threshold: 0.05
        })

        elapsed = performance.now() - start
        results = normalizeYoloPredictions(predictions)

        setActiveModelName('YOLOv10s')
      } else {
        const model = await ensureCocoLoaded()
        const start = performance.now()

        results = await model.detect(imageRef.current, 100, 0.05)

        elapsed = performance.now() - start
        setActiveModelName('COCO-SSD MobileNet V2')
      }

      setDetections(results)
      setInferenceTime(elapsed)

      console.log('Detection results:', results)
      console.log('Inference time:', elapsed.toFixed(2), 'ms')
    } catch (err) {
      console.error('Detection error:', err)

      setError(
        'Detection failed. Check your internet connection and browser console.'
      )

      setModelStatus('Model inference failed')
    } finally {
      setBusy(false)
    }
  }

  // --------------------------------------------------
  // Phase 3A — Dual-model benchmark
  // --------------------------------------------------

  async function runBenchmark() {
    if (!imageUrl || !imageReady || busy || benchmarkBusy || datasetBusy) return

    setBenchmarkBusy(true)
    setBusy(true)
    setBenchmark(null)
    setBenchmarkError('')
    setError('')
    setModelStatus('Preparing both models...')

    try {
      const yoloDetector = await ensureYoloLoaded()
      const cocoModel = await ensureCocoLoaded()

      setModelStatus('Warming up both models...')

      await yoloDetector(imageUrl, { threshold: 0.05 })
      await cocoModel.detect(imageRef.current, 100, 0.05)

      const RUNS = 3
      const yoloTimes = []
      const cocoTimes = []

      let yoloResults = []
      let cocoResults = []

      setModelStatus('Benchmarking YOLOv10s...')

      for (let i = 0; i < RUNS; i++) {
        const start = performance.now()

        const predictions = await yoloDetector(imageUrl, {
          threshold: 0.05
        })

        yoloTimes.push(performance.now() - start)
        yoloResults = normalizeYoloPredictions(predictions)
      }

      setModelStatus('Benchmarking COCO-SSD...')

      for (let i = 0; i < RUNS; i++) {
        const start = performance.now()

        const predictions = await cocoModel.detect(
          imageRef.current,
          100,
          0.05
        )

        cocoTimes.push(performance.now() - start)
        cocoResults = predictions
      }

      const result = {
        runs: RUNS,

        yolo: {
          results: yoloResults,
          detections: yoloResults.length,
          averageMs: average(yoloTimes),
          fps: 1000 / average(yoloTimes),
          times: yoloTimes
        },

        coco: {
          results: cocoResults,
          detections: cocoResults.length,
          averageMs: average(cocoTimes),
          fps: 1000 / average(cocoTimes),
          times: cocoTimes
        }
      }

      setBenchmark(result)
      setModelStatus('Benchmark completed')

      console.log('VisionGuard benchmark:', result)
    } catch (err) {
      console.error('Benchmark failed:', err)

      setBenchmarkError(
        'Benchmark failed. Check the browser console for details.'
      )

      setModelStatus('Benchmark failed')
    } finally {
      setBenchmarkBusy(false)
      setBusy(false)
    }
  }

  // --------------------------------------------------
  // Phase 4 — Multi-image inference and dataset evaluation
  // --------------------------------------------------

  async function runDatasetEvaluation() {
    if (!datasetImages.length || datasetBusy || busy || benchmarkBusy) return

    const missingAnnotations = datasetImages.filter(
      image => !Array.isArray(image.groundTruth)
    )

    if (missingAnnotations.length || datasetImages.every(image => !image.groundTruth?.length)) {
      setDatasetError(
        'Import annotations for every dataset image. At least one ground-truth bounding box is required.'
      )
      return
    }

    setDatasetBusy(true)
    setDatasetError('')
    setDatasetReport(null)
    setDatasetProgress({
      completed: 0,
      total: datasetImages.length,
      current: 'Loading models…'
    })

    const imageResults = []
    let yoloDetector = null
    let cocoModel = null
    let yoloLoadError = ''
    let cocoLoadError = ''

    try {
      // Load both models independently. A failure in one model must not
      // prevent the other model from evaluating the dataset.
      const [yoloLoad, cocoLoad] = await Promise.allSettled([
        ensureYoloLoaded(),
        ensureCocoLoaded()
      ])

      if (yoloLoad.status === 'fulfilled') {
        yoloDetector = yoloLoad.value
      } else {
        yoloLoadError = yoloLoad.reason?.message || 'YOLOv10s failed to load'
        console.error('YOLOv10s model loading failed:', yoloLoad.reason)
      }

      if (cocoLoad.status === 'fulfilled') {
        cocoModel = cocoLoad.value
      } else {
        cocoLoadError = cocoLoad.reason?.message || 'COCO-SSD failed to load'
        console.error('COCO-SSD model loading failed:', cocoLoad.reason)
      }

      if (!yoloDetector && !cocoModel) {
        throw new Error(
          `Both models failed to load. YOLOv10s: ${yoloLoadError}. COCO-SSD: ${cocoLoadError}`
        )
      }

      for (let index = 0; index < datasetImages.length; index++) {
        const item = datasetImages[index]
        setDatasetProgress({
          completed: index,
          total: datasetImages.length,
          current: item.name
        })

        const result = {
          id: item.id,
          name: item.name,
          groundTruth: item.groundTruth || [],
          yoloPredictions: [],
          cocoPredictions: [],
          yolo: yoloDetector ? null : { error: yoloLoadError },
          coco: cocoModel ? null : { error: cocoLoadError }
        }

        if (yoloDetector) {
          try {
            const start = performance.now()
            const predictions = await yoloDetector(item.previewUrl, {
              threshold: 0.001
            })
            const inferenceMs = performance.now() - start
            result.yoloPredictions = normalizeYoloPredictions(predictions)
            result.yolo = {
              inferenceMs,
              detections: result.yoloPredictions.length
            }
          } catch (error) {
            result.yolo = {
              error: error?.message || 'YOLOv10s inference failed'
            }
          }
        }

        if (cocoModel) {
          try {
            const imageElement = new Image()
            await new Promise((resolve, reject) => {
              imageElement.onload = resolve
              imageElement.onerror = () => reject(
                new Error('Could not load image for COCO-SSD')
              )
              imageElement.src = item.previewUrl
            })

            const start = performance.now()
            const predictions = await cocoModel.detect(imageElement, 100, 0.001)
            const inferenceMs = performance.now() - start
            result.cocoPredictions = predictions.map(prediction => ({
              class: String(prediction.class || '').trim().toLowerCase(),
              score: Number(prediction.score),
              bbox: Array.isArray(prediction.bbox)
                ? prediction.bbox.map(Number)
                : []
            })).filter(prediction =>
              prediction.class &&
              Number.isFinite(prediction.score) &&
              prediction.bbox.length === 4 &&
              prediction.bbox.every(Number.isFinite)
            )
            result.coco = {
              inferenceMs,
              detections: result.cocoPredictions.length
            }
          } catch (error) {
            result.coco = {
              error: error?.message || 'COCO-SSD inference failed'
            }
          }
        }

        imageResults.push(result)
        setDatasetProgress({
          completed: index + 1,
          total: datasetImages.length,
          current: item.name
        })
      }

      // Do not count inference failures as false negatives. Each model's
      // metrics use only images where that model completed inference.
      const yoloEvaluationImages = imageResults
        .filter(item => !item.yolo?.error)
        .map(item => ({
          id: item.id,
          groundTruth: item.groundTruth,
          predictions: item.yoloPredictions
        }))

      const cocoEvaluationImages = imageResults
        .filter(item => !item.coco?.error)
        .map(item => ({
          id: item.id,
          groundTruth: item.groundTruth,
          predictions: item.cocoPredictions
        }))

      const meanTime = key => {
        const times = imageResults
          .map(item => item[key]?.inferenceMs)
          .filter(Number.isFinite)
        return times.length
          ? times.reduce((sum, value) => sum + value, 0) / times.length
          : 0
      }

      const report = {
        application: 'VisionGuard',
        generatedAt: new Date().toISOString(),
        iouThreshold: 0.5,
        // AP/mAP uses confidence-ranked predictions; this low inference
        // cutoff retains candidates rather than applying the UI display slider.
        confidenceThreshold: 0.001,
        totalImages: datasetImages.length,
        processedImages: imageResults.length,
        totalGroundTruth: datasetImages.reduce(
          (sum, item) => sum + (item.groundTruth?.length || 0),
          0
        ),
        modelLoadErrors: {
          yolo: yoloLoadError || null,
          coco: cocoLoadError || null
        },
        speed: {
          yolo: meanTime('yolo'),
          coco: meanTime('coco')
        },
        evaluation: {
          yolo: evaluateModelDataset(yoloEvaluationImages),
          coco: evaluateModelDataset(cocoEvaluationImages)
        },
        imageResults
      }

      setDatasetReport(report)
      setModelStatus(
        yoloLoadError || cocoLoadError
          ? 'Dataset evaluation completed with a model warning'
          : 'Dataset evaluation completed'
      )
    } catch (error) {
      console.error('Dataset evaluation failed:', error)
      setDatasetError(
        error?.message || 'Dataset evaluation failed. Check the browser console.'
      )
    } finally {
      setDatasetBusy(false)
    }
  }

  // --------------------------------------------------
  // Clear analysis
  // --------------------------------------------------

  function clearAnalysis() {
    setImageUrl('')
    setImageReady(false)

    setImageSize({
      width: 0,
      height: 0
    })

    setDetections([])
    setInferenceTime(null)
    setActiveModelName('')
    setThreshold(50)
    setSelectedClass('all')
    setError('')

    setBenchmark(null)
    setBenchmarkError('')
    setGroundTruth([])
    setAnnotationMode(false)
    setDraftBox(null)
    setAnnotationStart(null)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // --------------------------------------------------
  // Download annotated image
  // --------------------------------------------------

  function downloadAnnotatedImage() {
    const img = imageRef.current

    if (!img || !filteredDetections.length) return

    const output = document.createElement('canvas')
    output.width = img.naturalWidth
    output.height = img.naturalHeight

    const ctx = output.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)
    ctx.lineWidth = Math.max(3, img.naturalWidth / 500)

    ctx.font = `bold ${Math.max(
      16,
      img.naturalWidth / 65
    )}px sans-serif`

    filteredDetections.forEach(result => {
      const [x, y, w, h] = result.bbox
      const label =
        `${result.class} ${Math.round(result.score * 100)}%`

      const textWidth = ctx.measureText(label).width
      const labelHeight = Math.max(25, img.naturalWidth / 45)

      ctx.strokeStyle = '#10b981'
      ctx.fillStyle = '#10b981'

      ctx.strokeRect(x, y, w, h)

      const labelY = Math.max(0, y - labelHeight)
      ctx.fillRect(x, labelY, textWidth + 16, labelHeight)

      ctx.fillStyle = '#052e24'
      ctx.fillText(label, x + 8, labelY + labelHeight * 0.72)
    })

    output.toBlob(blob => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'visionguard-annotated.png'
      link.click()

      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  // --------------------------------------------------
  // Export JSON report
  // --------------------------------------------------

  function downloadJSON() {
    const data = {
      application: 'VisionGuard',
      model: activeModelName,
      analyzedAt: new Date().toISOString(),
      inferenceTimeMs: inferenceTime,
      confidenceThreshold: threshold,
      totalDetections: filteredDetections.length,
      uniqueCategories: uniqueObjects,

      detections: filteredDetections.map(d => ({
        class: d.class,
        confidence: Number((d.score * 100).toFixed(2)),

        boundingBox: {
          x: Number(d.bbox[0].toFixed(2)),
          y: Number(d.bbox[1].toFixed(2)),
          width: Number(d.bbox[2].toFixed(2)),
          height: Number(d.bbox[3].toFixed(2))
        }
      }))
    }

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'visionguard-report.json'
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // --------------------------------------------------
  // Export benchmark and evaluation
  // --------------------------------------------------

  function downloadBenchmarkJSON() {
    if (!benchmark) return

    const data = {
      application: 'VisionGuard',
      generatedAt: new Date().toISOString(),
      confidenceThreshold: threshold,
      iouThreshold: IOU_THRESHOLD,
      benchmarkRuns: benchmark.runs,

      performance: {
        yolo: {
          averageInferenceMs: benchmark.yolo.averageMs,
          estimatedFps: benchmark.yolo.fps,
          individualRunsMs: benchmark.yolo.times
        },

        coco: {
          averageInferenceMs: benchmark.coco.averageMs,
          estimatedFps: benchmark.coco.fps,
          individualRunsMs: benchmark.coco.times
        }
      },

      detectionAgreement: comparison,

      groundTruth: {
        annotations: groundTruth
      },

      evaluation: {
        yolo: yoloMetrics,
        coco: cocoMetrics
      }
    }

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'visionguard-benchmark.json'
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // --------------------------------------------------
  // Reusable evaluation display
  // --------------------------------------------------

  function MetricCard({ label, value, color = 'text-white' }) {
    return (
      <div className="rounded-xl bg-slate-950 p-4">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${color}`}>
          {value}
        </p>
      </div>
    )
  }

  function EvaluationPanel({ name, metrics, color }) {
    if (!metrics) return null

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h3 className={`font-bold ${color}`}>{name}</h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard
            label="Precision"
            value={`${metrics.precision.toFixed(2)}%`}
            color="text-emerald-300"
          />

          <MetricCard
            label="Recall"
            value={`${metrics.recall.toFixed(2)}%`}
            color="text-sky-300"
          />

          <MetricCard
            label="F1-score"
            value={`${metrics.f1.toFixed(2)}%`}
            color="text-orange-300"
          />

          <MetricCard
            label="mAP@50"
            value={`${metrics.map50.toFixed(2)}%`}
            color="text-violet-300"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-900 p-3">
            <p className="text-xl font-bold text-emerald-300">{metrics.tp}</p>
            <p className="text-xs text-slate-500">TP</p>
          </div>

          <div className="rounded-lg bg-slate-900 p-3">
            <p className="text-xl font-bold text-rose-300">{metrics.fp}</p>
            <p className="text-xs text-slate-500">FP</p>
          </div>

          <div className="rounded-lg bg-slate-900 p-3">
            <p className="text-xl font-bold text-amber-300">{metrics.fn}</p>
            <p className="text-xs text-slate-500">FN</p>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-semibold">Per-class evaluation</h4>

          <div className="mt-3 space-y-2">
            {metrics.perClass.map(item => (
              <div
                key={item.class}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm"
              >
                <span className="capitalize">{item.class}</span>
                <span className="text-slate-400">
                  AP: {item.ap.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <a className="flex items-center gap-3 text-xl font-bold">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400 text-slate-950">
              V
            </span>
            Vision<span className="text-orange-400">Guard</span>
          </a>

          <span className="rounded-full bg-orange-400/10 px-3 py-1.5 text-center text-xs text-orange-300">
            MULTI-MODEL COMPUTER VISION LAB
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9">

        {/* Hero */}
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-400">
          AI / Image intelligence
        </p>

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          See beyond the{' '}
          <span className="text-orange-400">image.</span>
        </h1>

        <p className="mt-2 max-w-2xl text-slate-400">
          Multi-model object detection, performance benchmarking
          and ground-truth evaluation.
        </p>

        {/* Status */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
            ● {modelStatus}
          </span>

          <span className="text-xs text-slate-500">
            Models load on demand and run in your browser.
          </span>
        </div>

        {/* Main workspace */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* Image analyzer */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Image analyzer</h2>
                <p className="mt-1 text-sm text-slate-400">
                  JPG, PNG or WebP supported.
                </p>
              </div>

              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:border-orange-400"
              >
                ＋ Upload image
              </button>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={upload}
                className="hidden"
              />
            </div>

            {/* Model selector */}
            <div className="mt-6">
              <label className="text-sm font-semibold">
                Detection engine
              </label>

              <select
                value={selectedModel}
                onChange={event => {
                  setSelectedModel(event.target.value)
                  setDetections([])
                  setInferenceTime(null)
                  setActiveModelName('')
                  setSelectedClass('all')

                  setModelStatus(
                    event.target.value === 'yolo'
                      ? yoloDetectorRef.current
                        ? 'YOLOv10s ready'
                        : 'YOLOv10s will load on first run'
                      : cocoModelRef.current
                        ? `COCO-SSD ready · ${tf.getBackend().toUpperCase()}`
                        : 'COCO-SSD will load on first run'
                  )
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
              >
                <option value="yolo">YOLOv10s — ONNX Runtime</option>
                <option value="coco">COCO-SSD — MobileNet V2</option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                YOLO uses WebGPU when available, otherwise WASM.
                COCO-SSD uses TensorFlow.js.
              </p>
            </div>

            {/* Image preview */}
            <div className="relative mt-5 flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3">

              {imageUrl ? (
                <div
                  className="relative inline-block leading-none"
                  style={{
                    width: imageSize.width || 'auto',
                    height: imageSize.height || 'auto'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Uploaded for object detection"
                    className="block max-h-[520px] max-w-full rounded-lg object-contain"
                    onLoad={event => {
                      const img = event.currentTarget

                      setImageSize({
                        width: img.clientWidth,
                        height: img.clientHeight
                      })

                      setImageReady(true)
                    }}
                  />

                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none absolute left-0 top-0 h-full w-full"
                  />

                  <canvas
                    ref={groundTruthCanvasRef}
                    className="absolute left-0 top-0 h-full w-full"
                    style={{
                      pointerEvents: annotationMode ? 'auto' : 'none',
                      cursor: annotationMode ? 'crosshair' : 'default',
                      touchAction: 'none'
                    }}
                    onPointerDown={startAnnotation}
                    onPointerMove={moveAnnotation}
                    onPointerUp={finishAnnotation}
                    onPointerCancel={finishAnnotation}
                  />
                </div>
              ) : (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="p-8 text-center"
                >
                  <span className="text-5xl">⌁</span>
                  <p className="mt-4 font-semibold">
                    Choose an image to analyze
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Your image is processed in your browser.
                  </p>
                </button>
              )}
            </div>

            {error && (
              <p className="mt-3 text-sm text-rose-300">{error}</p>
            )}

            {/* Main actions */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                disabled={!imageReady || busy || datasetBusy}
                onClick={detect}
                className="rounded-xl bg-orange-400 py-3 font-bold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Loading / analyzing...' : 'Run object detection'}
              </button>

              <button
                onClick={clearAnalysis}
                disabled={!imageUrl || busy}
                className="rounded-xl border border-slate-700 py-3 font-semibold transition hover:border-rose-400 hover:text-rose-300 disabled:opacity-40"
              >
                Clear analysis
              </button>
            </div>

            <button
              onClick={runBenchmark}
              disabled={!imageReady || busy || benchmarkBusy || datasetBusy}
              className="mt-3 w-full rounded-xl border border-orange-400/40 bg-orange-400/10 py-3 font-bold text-orange-300 transition hover:bg-orange-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {benchmarkBusy
                ? 'Benchmarking both models...'
                : 'Compare both AI models'}
            </button>

            <p className="mt-2 text-xs text-slate-500">
              Runs both models on the same image. Warm-up is excluded
              from the measured inference times.
            </p>

            {/* Export controls */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={downloadAnnotatedImage}
                disabled={!filteredDetections.length}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
              >
                ↓ Download annotated image
              </button>

              <button
                onClick={downloadJSON}
                disabled={!filteredDetections.length}
                className="rounded-xl border border-slate-700 py-3 text-sm font-semibold transition hover:border-orange-400 disabled:opacity-40"
              >
                ↓ Export detection JSON
              </button>
            </div>
          </section>

          {/* Results panel */}
          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

            <h2 className="text-xl font-bold">Detection results</h2>

            <p className="mt-1 text-sm text-slate-400">
              Objects recognized by the selected model.
            </p>

            {activeModelName && (
              <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/5 p-3">
                <p className="text-xs text-slate-400">
                  Active detection engine
                </p>
                <p className="mt-1 font-semibold text-orange-300">
                  {activeModelName}
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricCard
                label="Total objects"
                value={filteredDetections.length}
                color="text-orange-400"
              />

              <MetricCard
                label="Unique categories"
                value={uniqueObjects}
                color="text-emerald-300"
              />

              <div className="col-span-2 rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Inference time</p>
                <p className="mt-1 text-2xl font-bold">
                  {inferenceTime !== null
                    ? `${inferenceTime.toFixed(1)} ms`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Confidence filter */}
            <div className="mt-6">
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
                className="mt-3 w-full accent-orange-400"
              />

              <div className="flex justify-between text-xs text-slate-500">
                <span>5%</span>
                <span>95%</span>
              </div>
            </div>

            {/* Class filter */}
            <div className="mt-5">
              <label className="text-sm font-semibold">
                Filter by object class
              </label>

              <select
                value={selectedClass}
                onChange={event => setSelectedClass(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-400"
              >
                <option value="all">All object classes</option>

                {objectClasses.map(objectClass => (
                  <option key={objectClass} value={objectClass}>
                    {objectClass.charAt(0).toUpperCase() + objectClass.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Distribution */}
            {Object.keys(classCounts).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">
                  Object distribution
                </h3>

                <div className="mt-3 space-y-3">
                  {Object.entries(classCounts).map(([name, count]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-slate-300">{name}</span>
                        <span className="font-semibold text-orange-400">
                          {count}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-orange-400"
                          style={{
                            width: `${
                              (count / filteredDetections.length) * 100
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detection list */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Detected objects</h3>

              <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                {filteredDetections.map((d, index) => (
                  <div
                    key={`${d.class}-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold capitalize">{d.class}</span>
                      <span className="text-sm text-emerald-300">
                        {Math.round(d.score * 100)}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-orange-400"
                        style={{ width: `${d.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}

                {!filteredDetections.length && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {detections.length
                      ? 'No detections match your filters.'
                      : 'Upload an image and run detection to see results.'}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ==========================================
            PHASE 3A — BENCHMARK DASHBOARD
        ========================================== */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
                Phase 03A · Performance laboratory
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Model benchmarking
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Compare inference performance and detection overlap.
              </p>
            </div>

            {benchmark && (
              <span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                Benchmark complete
              </span>
            )}
          </div>

          {benchmarkError && (
            <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
              {benchmarkError}
            </p>
          )}

          {!benchmark && !benchmarkBusy && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="font-semibold">No benchmark results yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Upload an image and run the dual-model benchmark.
              </p>
            </div>
          )}

          {benchmarkBusy && (
            <div className="mt-6 rounded-xl bg-slate-950 p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-orange-400" />
              <p className="mt-4 font-semibold">Running model benchmarks</p>
              <p className="mt-2 text-sm text-slate-500">
                Loading, warming up and timing both models.
              </p>
            </div>
          )}

          {benchmark && (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  {
                    name: 'YOLOv10s',
                    result: benchmark.yolo,
                    color: 'text-orange-300'
                  },
                  {
                    name: 'COCO-SSD MobileNet V2',
                    result: benchmark.coco,
                    color: 'text-emerald-300'
                  }
                ].map(model => (
                  <div
                    key={model.name}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <p className={`text-sm font-semibold ${model.color}`}>
                      {model.name}
                    </p>

                    <p className="mt-4 text-xs text-slate-400">
                      Average inference time
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {model.result.averageMs.toFixed(2)}
                      <span className="ml-1 text-sm text-slate-500">ms</span>
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Detections</p>
                        <p className="mt-1 text-xl font-bold">
                          {model.result.detections}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Estimated FPS</p>
                        <p className="mt-1 text-xl font-bold">
                          {model.result.fps.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-xl bg-slate-950 p-5">
                <h3 className="font-semibold">Inference time comparison</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Lower is faster. Average of {benchmark.runs} measured runs.
                </p>

                {[
                  { name: 'YOLOv10s', time: benchmark.yolo.averageMs },
                  { name: 'COCO-SSD', time: benchmark.coco.averageMs }
                ].map(item => {
                  const maxTime = Math.max(
                    benchmark.yolo.averageMs,
                    benchmark.coco.averageMs,
                    0.01
                  )

                  return (
                    <div key={item.name} className="mt-5">
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-semibold">
                          {item.time.toFixed(2)} ms
                        </span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-orange-400 transition-all"
                          style={{
                            width: `${Math.max(2, (item.time / maxTime) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-7 rounded-xl bg-slate-950 p-5">
                <h3 className="font-semibold">Detection agreement</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Same-class detections matched at an IoU of 50% or higher.
                </p>

                <p className="mt-5 text-4xl font-bold text-orange-400">
                  {comparison.agreement.toFixed(1)}%
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Detection overlap score — not a true accuracy score.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <MetricCard label="Matched" value={comparison.matched} color="text-emerald-300" />
                  <MetricCard label="YOLO only" value={comparison.yoloOnly} color="text-orange-300" />
                  <MetricCard label="COCO only" value={comparison.cocoOnly} color="text-sky-300" />
                </div>
              </div>

              <div className="mt-7">
                <h3 className="font-semibold">Individual inference runs</h3>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-3">Run</th>
                        <th className="py-3">YOLOv10s</th>
                        <th className="py-3">COCO-SSD</th>
                      </tr>
                    </thead>

                    <tbody>
                      {benchmark.yolo.times.map((time, index) => (
                        <tr key={index} className="border-t border-slate-800">
                          <td className="py-3 text-slate-400">
                            Run {index + 1}
                          </td>
                          <td className="py-3">{time.toFixed(2)} ms</td>
                          <td className="py-3">
                            {benchmark.coco.times[index].toFixed(2)} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ==========================================
            PHASE 3B — GROUND TRUTH ANNOTATION
        ========================================== */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
            Phase 03B · Ground-truth laboratory
          </p>

          <h2 className="mt-2 text-2xl font-bold">Accuracy evaluation</h2>

          <p className="mt-1 text-sm text-slate-400">
            Label objects manually and evaluate both models against
            your annotations.
          </p>

          <div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
            <p className="font-semibold text-sky-300">
              How to create ground truth
            </p>

            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-300">
              <li>Upload an image and run the dual-model benchmark.</li>
              <li>Enter an object's class name, such as person, car or dog.</li>
              <li>Enable annotation mode.</li>
              <li>Drag a rectangle around each real object.</li>
              <li>Repeat for every object you want to evaluate.</li>
            </ol>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="text-sm font-semibold">
                Ground-truth class label
              </label>

              <input
                value={annotationClass}
                onChange={event => setAnnotationClass(event.target.value)}
                placeholder="Example: person"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
              />

              <p className="mt-1 text-xs text-slate-500">
                Use the same class names as the detector labels.
                Example: person, car, dog, bicycle.
              </p>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setAnnotationMode(previous => !previous)
                  setDraftBox(null)
                  setAnnotationStart(null)
                }}
                disabled={!imageReady || !annotationClass.trim()}
                className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition disabled:opacity-40 sm:w-auto ${
                  annotationMode
                    ? 'bg-sky-400 text-slate-950'
                    : 'border border-sky-400/40 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20'
                }`}
              >
                {annotationMode ? 'Finish annotating' : 'Enable annotation'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Ground-truth annotations:{' '}
              <span className="font-bold text-sky-300">
                {groundTruth.length}
              </span>
            </p>

            <button
              onClick={clearGroundTruth}
              disabled={!groundTruth.length}
              className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
            >
              Clear all annotations
            </button>
          </div>

          {annotationMode && (
            <p className="mt-4 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200">
              Annotation mode is active. Drag over the image to draw
              a ground-truth bounding box.
            </p>
          )}

          {groundTruth.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Your annotations</h3>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {groundTruth.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold capitalize">
                        {index + 1}. {item.class}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {Math.round(item.bbox[2])} × {Math.round(item.bbox[3])} px
                      </p>
                    </div>

                    <button
                      onClick={() => removeGroundTruth(item.id)}
                      className="rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Evaluation results</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Model predictions compared with your manual annotations.
                </p>
              </div>

              {benchmark && groundTruth.length > 0 && (
                <span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                  Ready to evaluate
                </span>
              )}
            </div>

            {!benchmark && (
              <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Run the dual-model benchmark first.
              </p>
            )}

            {benchmark && !groundTruth.length && (
              <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Add ground-truth boxes to calculate precision,
                recall, F1-score and mAP@50.
              </p>
            )}

            {benchmark && groundTruth.length > 0 && (
              <>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <EvaluationPanel
                    name="YOLOv10s evaluation"
                    metrics={yoloMetrics}
                    color="text-orange-300"
                  />

                  <EvaluationPanel
                    name="COCO-SSD evaluation"
                    metrics={cocoMetrics}
                    color="text-emerald-300"
                  />
                </div>

                <div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
                  <p className="font-semibold text-sky-300">
                    Evaluation settings
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">IoU threshold</p>
                      <p className="mt-1 font-bold">50%</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Confidence</p>
                      <p className="mt-1 font-bold">{threshold}%</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Ground truth</p>
                      <p className="mt-1 font-bold">{groundTruth.length}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Classes labelled</p>
                      <p className="mt-1 font-bold">
                        {new Set(groundTruth.map(item => item.class)).size}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ==========================================
            PHASE 4 — DATASET UPLOAD & PREVIEW
        ========================================== */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                Phase 04 · Dataset laboratory
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Dataset evaluation
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Upload images, import ground-truth labels, then evaluate both detection models across the dataset.
              </p>
            </div>

            <span className="rounded-full bg-violet-400/10 px-3 py-2 text-xs text-violet-300">
              {datasetImages.length} images uploaded
            </span>
          </div>

          <div className={datasetBusy ? 'pointer-events-none mt-6 opacity-50' : 'mt-6'}>
            <DatasetUploader
              images={datasetImages}
              onImagesAdded={handleImagesAdded}
            />
          </div>

          <div className={datasetBusy ? 'pointer-events-none mt-6 opacity-50' : 'mt-6'}>
            <AnnotationImporter images={datasetImages} onImported={handleAnnotationsImported} />
          </div>

          <div className={datasetBusy ? 'pointer-events-none mt-6 opacity-50' : 'mt-6'}>
            <DatasetPreview
              images={datasetImages}
              onRemove={handleRemoveImage}
              onClear={handleClearDataset}
            />
          </div>

          {datasetImages.length > 0 && (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={runDatasetEvaluation}
                disabled={datasetBusy || busy || benchmarkBusy || datasetImages.every(image => !image.groundTruth?.length)}
                className="w-full rounded-xl bg-violet-400 py-3 font-bold text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {datasetBusy ? `Evaluating dataset… ${datasetProgress.completed}/${datasetProgress.total}` : 'Run YOLOv10s + COCO-SSD Dataset Evaluation'}
              </button>
              {datasetBusy && <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-violet-400 transition-all" style={{ width: `${datasetProgress.total ? datasetProgress.completed / datasetProgress.total * 100 : 0}%` }} /></div>}
              {datasetBusy && <p className="text-xs text-slate-400">Processing: {datasetProgress.current}. Each model runs independently; individual failures won't stop the remaining images.</p>}
              {datasetError && <p className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-300">{datasetError}</p>}
            </div>
          )}

          {datasetReport && (
            <div className="mt-6 space-y-4">
              <DatasetEvaluationDashboard report={datasetReport} />
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => exportDatasetJSON(datasetReport)} className="rounded-xl border border-slate-700 py-3 font-semibold hover:border-violet-300">↓ Export dataset JSON report</button>
                <button type="button" onClick={() => exportDatasetCSV(datasetReport)} className="rounded-xl border border-slate-700 py-3 font-semibold hover:border-violet-300">↓ Export dataset CSV report</button>
              </div>
            </div>
          )}

          {datasetImages.length > 0 && (
            <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
              <p className="font-semibold text-violet-300">
                Dataset successfully loaded
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Import annotations above, then run both models over every image to generate dataset-wide metrics and reports.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Total images</p>
                  <p className="mt-1 text-xl font-bold text-violet-300">
                    {datasetImages.length}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Total size</p>
                  <p className="mt-1 text-xl font-bold">
                    {(
                      datasetImages.reduce(
                        (total, image) => total + image.size,
                        0
                      ) / (1024 * 1024)
                    ).toFixed(2)} MB
                  </p>
                </div>

                <div className="col-span-2 rounded-lg bg-slate-950 p-3 sm:col-span-1">
                  <p className="text-xs text-slate-500">Supported formats</p>
                  <p className="mt-1 text-sm font-bold">
                    JPG · PNG · WebP
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Export benchmark */}
        <div className="mt-5">
          <button
            onClick={downloadBenchmarkJSON}
            disabled={!benchmark}
            className="w-full rounded-xl border border-slate-700 py-3 font-semibold transition hover:border-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓ Export complete benchmark and evaluation JSON
          </button>
        </div>

        {/* Important note */}
        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-sm font-semibold text-amber-200">
            Evaluation limitations
          </p>

          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Metrics are calculated against the boxes you manually annotate
            in this image. mAP@50 is calculated using 101-point interpolated
            average precision across classes that have ground-truth boxes.
            A single image is useful for testing, but it is not a reliable
            estimate of general model performance. For a meaningful model
            comparison, evaluate a diverse labelled dataset. Predictions
            below the selected confidence threshold are excluded.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          VisionGuard · Multi-model computer vision laboratory.
        </p>
      </div>
    </main>
  )
}

export default App
