
import { matchDetections } from './matching.js'
import { calculatePrecisionRecall } from './precisionRecall.js'

export function analyzeDatasetBenchmark(
  images = [],
  predictionKey = 'predictions'
) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  const results = images.map((image, index) => {
    const groundTruth = Array.isArray(image?.groundTruth)
      ? image.groundTruth
      : []

    const predictions = Array.isArray(image?.[predictionKey])
      ? image[predictionKey]
      : []

    const matched = matchDetections(
      predictions,
      groundTruth,
      0.5
    )

    const metrics = calculatePrecisionRecall(
      matched.truePositives,
      matched.falsePositives,
      matched.falseNegatives
    )

    let performance = 'moderate'

    if (metrics.f1 >= 80) {
      performance = 'strong'
    } else if (metrics.f1 < 50) {
      performance = 'weak'
    }

    return {
      id: image?.id ?? index,
      name: image?.name || `Image ${index + 1}`,
      condition: image?.condition || 'normal',
      groundTruth: groundTruth.length,
      predictions: predictions.length,
      tp: matched.truePositives,
      fp: matched.falsePositives,
      fn: matched.falseNegatives,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      performance
    }
  })

  const totalImages = results.length

  const strongImages = results.filter(
    item => item.performance === 'strong'
  ).length

  const moderateImages = results.filter(
    item => item.performance === 'moderate'
  ).length

  const weakImages = results.filter(
    item => item.performance === 'weak'
  ).length

  const averageF1 = totalImages
    ? results.reduce((sum, item) => sum + item.f1, 0) / totalImages
    : 0

  return {
    totalImages,
    strongImages,
    moderateImages,
    weakImages,
    averageF1,
    consistencyRate: totalImages
      ? (strongImages / totalImages) * 100
      : 0,
    imageResults: results.sort((a, b) => a.f1 - b.f1)
  }
}
