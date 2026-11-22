
import { matchDetections } from './matching.js'

export function analyzeDetectionErrors(images = []) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  const imageResults = []
  const classStats = {}

  let totalTP = 0
  let totalFP = 0
  let totalFN = 0

  let localizationErrors = 0
  let classificationErrors = 0
  let backgroundFalsePositives = 0

  for (const image of images) {
    const imageId = image?.id ?? 'unknown'

    const predictions = Array.isArray(image?.predictions)
      ? image.predictions
      : []

    const groundTruth = Array.isArray(image?.groundTruth)
      ? image.groundTruth
      : []

    const matched = matchDetections(
      predictions,
      groundTruth,
      0.5
    )

    totalTP += matched.truePositives
    totalFP += matched.falsePositives
    totalFN += matched.falseNegatives

    const truePositiveResults = matched.truePositiveResults.map(
      prediction => ({
        ...prediction,
        imageId
      })
    )

    const falsePositives = matched.falsePositiveResults.map(
      prediction => ({
        ...prediction,
        imageId
      })
    )

    const falseNegatives = matched.falseNegativeResults.map(
      truth => ({
        ...truth,
        imageId
      })
    )

    for (const prediction of falsePositives) {
      const className = prediction.class

      if (!classStats[className]) {
        classStats[className] = {
          class: className,
          falsePositives: 0,
          falseNegatives: 0,
          localizationErrors: 0,
          classificationErrors: 0,
          backgroundFalsePositives: 0
        }
      }

      classStats[className].falsePositives += 1

      if (prediction.errorType === 'localization_error') {
        localizationErrors += 1
        classStats[className].localizationErrors += 1
      } else if (prediction.errorType === 'classification_error') {
        classificationErrors += 1
        classStats[className].classificationErrors += 1
      } else {
        backgroundFalsePositives += 1
        classStats[className].backgroundFalsePositives += 1
      }
    }

    for (const truth of falseNegatives) {
      const className = truth.class

      if (!classStats[className]) {
        classStats[className] = {
          class: className,
          falsePositives: 0,
          falseNegatives: 0,
          localizationErrors: 0,
          classificationErrors: 0,
          backgroundFalsePositives: 0
        }
      }

      classStats[className].falseNegatives += 1
    }

    imageResults.push({
      imageId,
      truePositives: matched.truePositives,
      falsePositives: matched.falsePositives,
      falseNegatives: matched.falseNegatives,
      truePositiveResults,
      falsePositiveResults: falsePositives,
      falseNegativeResults: falseNegatives
    })
  }

  const perClass = Object.values(classStats)
    .map(item => ({
      ...item,
      totalErrors: item.falsePositives + item.falseNegatives
    }))

  return {
    iouThreshold: 0.5,
    evaluatedImages: imageResults.length,

    summary: {
      truePositives: totalTP,
      falsePositives: totalFP,
      falseNegatives: totalFN,
      totalErrors: totalFP + totalFN
    },

    errorBreakdown: {
      localizationErrors,
      classificationErrors,
      backgroundFalsePositives,
      missedDetections: totalFN
    },

    perClass,
    perImage: imageResults
  }
}
