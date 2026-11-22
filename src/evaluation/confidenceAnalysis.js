
import { matchDetections } from './matching.js'
import { calculatePrecisionRecall } from './precisionRecall.js'

const DEFAULT_THRESHOLDS = Array.from(
  { length: 19 },
  (_, index) => Number(((index + 1) * 0.05).toFixed(2))
)

export function evaluateConfidenceThresholds(
  images,
  thresholds = DEFAULT_THRESHOLDS
) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  const validThresholds = [...new Set(thresholds)]
    .filter(
      value =>
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
    )
    .sort((a, b) => a - b)

  if (validThresholds.length === 0) {
    throw new Error('At least one valid confidence threshold is required')
  }

  const results = validThresholds.map(threshold => {
    let tp = 0
    let fp = 0
    let fn = 0

    for (const image of images) {
      const predictions = Array.isArray(image?.predictions)
        ? image.predictions.filter(
            prediction =>
              Number.isFinite(prediction?.score) &&
              prediction.score >= threshold
          )
        : []

      const groundTruth = Array.isArray(image?.groundTruth)
        ? image.groundTruth
        : []

      const matched = matchDetections(
        predictions,
        groundTruth,
        0.5
      )

      tp += matched.truePositives
      fp += matched.falsePositives
      fn += matched.falseNegatives
    }

    const metrics = calculatePrecisionRecall(tp, fp, fn)

    return {
      threshold,
      ...metrics,
      tp,
      fp,
      fn
    }
  })

  const findBest = metric =>
    results.reduce((best, current) => {
      if (!best || current[metric] > best[metric]) {
        return current
      }

      return best
    }, null)

  const bestF1 = findBest('f1')
  const bestPrecision = findBest('precision')
  const bestRecall = findBest('recall')

  return {
    thresholds: results,

    bestThreshold: bestF1?.threshold ?? null,

    bestMetrics: bestF1
      ? {
          precision: bestF1.precision,
          recall: bestF1.recall,
          f1: bestF1.f1
        }
      : null,

    recommendations: {
      balanced: bestF1?.threshold ?? null,
      precisionFocused: bestPrecision?.threshold ?? null,
      recallFocused: bestRecall?.threshold ?? null
    },

    bestPrecisionThreshold: bestPrecision?.threshold ?? null,
    bestRecallThreshold: bestRecall?.threshold ?? null,

    iouThreshold: 0.5,
    evaluatedImages: images.length
  }
}
