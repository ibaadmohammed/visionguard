
import { calculateIoU, isValidBoundingBox } from './iou.js'

export function matchDetections(
  predictions,
  groundTruth,
  iouThreshold = 0.5
) {
  const validPredictions = predictions
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

  const validGroundTruth = groundTruth.filter(
    (item) =>
      item &&
      typeof item.class === 'string' &&
      isValidBoundingBox(item.bbox)
  )

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
        matchedGroundTruth: bestMatch,
        iou: bestIoU
      }
    }

    return {
      ...prediction,
      truePositive: 0,
      falsePositive: 1,
      matchedGroundTruth: null,
      iou: 0
    }
  })

  return {
    results,
    truePositives: matchedGroundTruth.size,
    falsePositives: results.filter(
      (item) => item.falsePositive === 1
    ).length,
    falseNegatives:
      validGroundTruth.length - matchedGroundTruth.size,
    totalGroundTruth: validGroundTruth.length
  }
}
