
import { calculateIoU, isValidBoundingBox } from './iou.js'

export function matchDetections(
  predictions = [],
  groundTruth = [],
  iouThreshold = 0.5
) {
  const safePredictions = Array.isArray(predictions)
    ? predictions
    : []

  const safeGroundTruth = Array.isArray(groundTruth)
    ? groundTruth
    : []

  const validPredictions = safePredictions
    .filter(
      (prediction) =>
        prediction &&
        typeof prediction.class === 'string' &&
        Number.isFinite(prediction.score) &&
        prediction.score >= 0 &&
        prediction.score <= 1 &&
        isValidBoundingBox(prediction.bbox)
    )
    .map((prediction, index) => ({
      ...prediction,
      originalIndex: index
    }))
    .sort((a, b) => b.score - a.score)

  const validGroundTruth = safeGroundTruth
    .filter(
      (item) =>
        item &&
        typeof item.class === 'string' &&
        isValidBoundingBox(item.bbox)
    )
    .map((item, index) => ({
      ...item,
      originalIndex: index
    }))

  const matchedGroundTruth = new Set()

  const results = validPredictions.map((prediction) => {
    let bestMatch = -1
    let bestIoU = 0

    validGroundTruth.forEach((truth, index) => {
      if (matchedGroundTruth.has(index)) return
      if (truth.class !== prediction.class) return

      const iou = calculateIoU(
        prediction.bbox,
        truth.bbox
      )

      if (iou >= iouThreshold && iou > bestIoU) {
        bestIoU = iou
        bestMatch = index
      }
    })

    if (bestMatch !== -1) {
      matchedGroundTruth.add(bestMatch)

      return {
        ...prediction,
        truePositive: 1,
        falsePositive: 0,
        matchedGroundTruth: validGroundTruth[bestMatch].originalIndex,
        iou: bestIoU,
        errorType: null
      }
    }

    const sameClassGroundTruth = validGroundTruth
      .map((truth) => ({
        truth,
        iou: calculateIoU(prediction.bbox, truth.bbox)
      }))
      .filter(({ truth }) => truth.class === prediction.class)

    const wrongClassGroundTruth = validGroundTruth
      .map((truth) => ({
        truth,
        iou: calculateIoU(prediction.bbox, truth.bbox)
      }))
      .filter(({ truth }) => truth.class !== prediction.class)

    const bestSameClassIoU = Math.max(
      0,
      ...sameClassGroundTruth.map((item) => item.iou)
    )

    const bestWrongClass = wrongClassGroundTruth.reduce(
      (best, current) =>
        current.iou > best.iou ? current : best,
      { truth: null, iou: 0 }
    )

    let errorType = 'background_false_positive'

    if (bestSameClassIoU > 0 && bestSameClassIoU < iouThreshold) {
      errorType = 'localization_error'
    } else if (
      bestWrongClass.truth &&
      bestWrongClass.iou >= iouThreshold
    ) {
      errorType = 'classification_error'
    }

    return {
      ...prediction,
      truePositive: 0,
      falsePositive: 1,
      matchedGroundTruth: null,
      iou: Math.max(bestSameClassIoU, bestWrongClass.iou),
      errorType
    }
  })

  const falseNegatives = validGroundTruth
    .map((truth, index) => ({
      ...truth,
      originalIndex: truth.originalIndex,
      groundTruthIndex: index
    }))
    .filter((truth) => !matchedGroundTruth.has(truth.groundTruthIndex))
    .map((truth) => ({
      ...truth,
      falseNegative: 1,
      errorType: 'missed_detection'
    }))

  const truePositiveResults = results.filter(
    (item) => item.truePositive === 1
  )

  const falsePositiveResults = results.filter(
    (item) => item.falsePositive === 1
  )

  return {
    results,
    truePositiveResults,
    falsePositiveResults,
    falseNegativeResults: falseNegatives,
    truePositives: truePositiveResults.length,
    falsePositives: falsePositiveResults.length,
    falseNegatives: falseNegatives.length,
    totalGroundTruth: validGroundTruth.length
  }
}
