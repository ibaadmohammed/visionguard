
import { matchDetections } from './matching.js'
import { calculateAveragePrecision } from './averagePrecision.js'

const IOU_THRESHOLDS = Array.from(
  { length: 10 },
  (_, index) => Number((0.5 + index * 0.05).toFixed(2))
)

/**
 * Dataset format:
 *
 * images = [
 *   {
 *     id: 'image-1',
 *     predictions: [{ class, score, bbox }],
 *     groundTruth: [{ class, bbox }]
 *   }
 * ]
 */

export function evaluateDataset(images) {
  const classes = new Set()

  images.forEach((image) => {
    image.groundTruth.forEach((item) => classes.add(item.class))
    image.predictions.forEach((item) => classes.add(item.class))
  })

  const validClasses = [...classes].filter((className) =>
    images.some((image) =>
      image.groundTruth.some((item) => item.class === className)
    )
  )

  const classResults = {}

  for (const className of validClasses) {
    const classPredictions = images.flatMap((image) =>
      image.predictions
        .filter((item) => item.class === className)
        .map((item) => ({
          ...item,
          imageId: image.id
        }))
    )

    const totalGroundTruth = images.reduce(
      (total, image) =>
        total +
        image.groundTruth.filter(
          (item) => item.class === className
        ).length,
      0
    )

    const apByThreshold = {}

    for (const iouThreshold of IOU_THRESHOLDS) {
      const matchedPredictions = []

      for (const image of images) {
        const predictions = image.predictions.filter(
          (item) => item.class === className
        )

        const groundTruth = image.groundTruth.filter(
          (item) => item.class === className
        )

        const matched = matchDetections(
          predictions,
          groundTruth,
          iouThreshold
        )

        matchedPredictions.push(
          ...matched.results.map((item) => ({
            score: item.score,
            truePositive: item.truePositive,
            falsePositive: item.falsePositive
          }))
        )
      }

      apByThreshold[iouThreshold.toFixed(2)] =
        calculateAveragePrecision(
          matchedPredictions,
          totalGroundTruth
        )
    }

    const ap50 = apByThreshold['0.50']

    const map5095 =
      Object.values(apByThreshold).reduce(
        (sum, value) => sum + value,
        0
      ) / IOU_THRESHOLDS.length

    classResults[className] = {
      ap50,
      map5095,
      apByThreshold,
      totalGroundTruth,
      totalPredictions: classPredictions.length
    }
  }

  const classCount = validClasses.length

  const mean = (key) =>
    classCount === 0
      ? 0
      : validClasses.reduce(
          (sum, className) => sum + classResults[className][key],
          0
        ) / classCount

  return {
    classes: classResults,
    evaluatedClasses: classCount,
    mAP50: mean('ap50'),
    mAP5095: mean('map5095')
  }
}
