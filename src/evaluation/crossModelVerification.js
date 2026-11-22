
import { calculateIoU } from './iou.js'

const DEFAULT_IOU_THRESHOLD = 0.5

export function compareModelPredictions(
  yoloPredictions = [],
  cocoPredictions = [],
  iouThreshold = DEFAULT_IOU_THRESHOLD
) {
  if (
    !Array.isArray(yoloPredictions) ||
    !Array.isArray(cocoPredictions)
  ) {
    throw new TypeError('Predictions must be arrays')
  }

  const usedCoco = new Set()
  const matches = []
  const yoloOnly = []
  const cocoOnly = []
  const classDisagreements = []

  const valid = prediction =>
    prediction &&
    typeof prediction.class === 'string' &&
    prediction.class.trim() &&
    Array.isArray(prediction.bbox) &&
    prediction.bbox.length === 4 &&
    prediction.bbox.every(Number.isFinite)

  const yolo = yoloPredictions.filter(valid)
  const coco = cocoPredictions.filter(valid)

  const sortedYolo = [...yolo].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  )

  for (const yoloPrediction of sortedYolo) {
    let bestIndex = -1
    let bestIoU = 0

    coco.forEach((cocoPrediction, index) => {
      if (usedCoco.has(index)) return

      const iou = calculateIoU(
        yoloPrediction.bbox,
        cocoPrediction.bbox
      )

      if (iou > bestIoU) {
        bestIoU = iou
        bestIndex = index
      }
    })

    if (bestIndex !== -1 && bestIoU >= iouThreshold) {
      const cocoPrediction = coco[bestIndex]
      usedCoco.add(bestIndex)

      const isSameClass =
        yoloPrediction.class.toLowerCase() ===
        cocoPrediction.class.toLowerCase()

      const match = {
        yolo: yoloPrediction,
        coco: cocoPrediction,
        iou: bestIoU,
        classAgreement: isSameClass,
        confidenceDifference: Math.abs(
          (yoloPrediction.score || 0) -
          (cocoPrediction.score || 0)
        )
      }

      matches.push(match)

      if (!isSameClass) {
        classDisagreements.push(match)
      }
    } else {
      yoloOnly.push(yoloPrediction)
    }
  }

  coco.forEach((prediction, index) => {
    if (!usedCoco.has(index)) {
      cocoOnly.push(prediction)
    }
  })

  const agreements = matches.filter(
    item => item.classAgreement
  )

  return {
    iouThreshold,
    summary: {
      yoloDetections: yolo.length,
      cocoDetections: coco.length,
      matchedDetections: matches.length,
      agreements: agreements.length,
      classDisagreements: classDisagreements.length,
      yoloOnly: yoloOnly.length,
      cocoOnly: cocoOnly.length
    },
    matches,
    agreements,
    classDisagreements,
    yoloOnly,
    cocoOnly
  }
}

export function analyzeCrossModelDataset(images = []) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  const perImage = []

  const totals = {
    yoloDetections: 0,
    cocoDetections: 0,
    matchedDetections: 0,
    agreements: 0,
    classDisagreements: 0,
    yoloOnly: 0,
    cocoOnly: 0
  }

  for (const image of images) {
    if (image?.yolo?.error || image?.coco?.error) {
      continue
    }

    const comparison = compareModelPredictions(
      image?.yoloPredictions || [],
      image?.cocoPredictions || []
    )

    Object.keys(totals).forEach(key => {
      totals[key] += comparison.summary[key] || 0
    })

    perImage.push({
      imageId: image?.id ?? 'unknown',
      imageName: image?.name ?? 'Unknown image',
      ...comparison
    })
  }

  const agreementRate =
    totals.matchedDetections > 0
      ? (totals.agreements / totals.matchedDetections) * 100
      : 0

  return {
    evaluatedImages: perImage.length,
    iouThreshold: DEFAULT_IOU_THRESHOLD,
    summary: {
      ...totals,
      agreementRate: Number(agreementRate.toFixed(2))
    },
    perImage
  }
}
