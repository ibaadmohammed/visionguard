
import { matchDetections } from './matching.js'
import { evaluateDataset } from './mapEvaluation.js'
import { calculatePrecisionRecall } from './precisionRecall.js'
import { evaluateConfidenceThresholds } from './confidenceAnalysis.js'
import { analyzeDetectionErrors } from './errorAnalysis.js'
import { analyzeDatasetBenchmark } from './datasetBenchmark.js'

export function evaluateModelDataset(
  images,
  predictionKey = 'predictions'
) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  const normalized = images.map((image, index) => ({
    id: image?.id ?? index,
    groundTruth: Array.isArray(image?.groundTruth)
      ? image.groundTruth
      : [],
    predictions: Array.isArray(image?.[predictionKey])
      ? image[predictionKey]
      : []
  }))

  let tp = 0
  let fp = 0
  let fn = 0

  const perClassCounts = new Map()

  normalized.forEach(image => {
    const matched = matchDetections(
      image.predictions,
      image.groundTruth,
      0.5
    )

    tp += matched.truePositives
    fp += matched.falsePositives
    fn += matched.falseNegatives

    const names = new Set([
      ...image.groundTruth.map(item => item?.class).filter(Boolean),
      ...image.predictions.map(item => item?.class).filter(Boolean)
    ])

    names.forEach(name => {
      const classPredictions = image.predictions.filter(
        item => item?.class === name
      )

      const classGroundTruth = image.groundTruth.filter(
        item => item?.class === name
      )

      const result = matchDetections(
        classPredictions,
        classGroundTruth,
        0.5
      )

      const current = perClassCounts.get(name) || {
        class: name,
        tp: 0,
        fp: 0,
        fn: 0,
        groundTruth: 0,
        predictions: 0
      }

      current.tp += result.truePositives
      current.fp += result.falsePositives
      current.fn += result.falseNegatives
      current.groundTruth += result.totalGroundTruth
      current.predictions += classPredictions.length

      perClassCounts.set(name, current)
    })
  })

  const overall = calculatePrecisionRecall(tp, fp, fn)

  const map = evaluateDataset(normalized)

  const perClass = [...perClassCounts.values()]
    .map(item => {
      const metrics = calculatePrecisionRecall(
        item.tp,
        item.fp,
        item.fn
      )

      const ap = map.classes[item.class]

      return {
        ...item,
        ...metrics,
        ap50: (ap?.ap50 ?? 0) * 100,
        map5095: (ap?.map5095 ?? 0) * 100
      }
    })
    .sort((a, b) => a.class.localeCompare(b.class))

  const confidenceAnalysis =
    evaluateConfidenceThresholds(normalized)

  // Phase 7B: detailed false-positive and false-negative analysis.
  const errorAnalysis = analyzeDetectionErrors(normalized)

  // Phase 7F: dataset-level benchmark.
  const datasetBenchmark = analyzeDatasetBenchmark(normalized)

  return {
    images: normalized.length,

    tp,
    fp,
    fn,

    precision: overall.precision,
    recall: overall.recall,
    f1: overall.f1,

    mAP50: map.mAP50 * 100,
    mAP5095: map.mAP5095 * 100,

    evaluatedClasses: map.evaluatedClasses,
    perClass,

    confidenceAnalysis,

    errorAnalysis,

    datasetBenchmark
  }
}
