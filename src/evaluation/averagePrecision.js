
/**
 * VisionGuard - Average Precision
 * Uses 101-point interpolated precision-recall.
 */

export function calculateAveragePrecision(
  predictions,
  totalGroundTruth
) {
  if (!Number.isFinite(totalGroundTruth) || totalGroundTruth <= 0) {
    return null
  }

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return 0
  }

  const sorted = [...predictions]
    .filter(
      (item) =>
        Number.isFinite(item.score) &&
        (item.truePositive === 0 || item.truePositive === 1) &&
        (item.falsePositive === 0 || item.falsePositive === 1)
    )
    .sort((a, b) => b.score - a.score)

  let cumulativeTP = 0
  let cumulativeFP = 0

  const precisionValues = []
  const recallValues = []

  for (const prediction of sorted) {
    cumulativeTP += prediction.truePositive
    cumulativeFP += prediction.falsePositive

    precisionValues.push(
      cumulativeTP / (cumulativeTP + cumulativeFP)
    )

    recallValues.push(cumulativeTP / totalGroundTruth)
  }

  let totalPrecision = 0

  for (let i = 0; i <= 100; i++) {
    const recallThreshold = i / 100
    let maximumPrecision = 0

    for (let j = 0; j < recallValues.length; j++) {
      if (recallValues[j] >= recallThreshold) {
        maximumPrecision = Math.max(
          maximumPrecision,
          precisionValues[j]
        )
      }
    }

    totalPrecision += maximumPrecision
  }

  return totalPrecision / 101
}
