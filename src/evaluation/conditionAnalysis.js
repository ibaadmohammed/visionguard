
import { evaluateModelDataset } from './datasetEvaluator.js'

const CONDITIONS = [
  'normal',
  'low_light',
  'blur',
  'occlusion',
  'crowded'
]

export function analyzeConditionPerformance(images = []) {
  if (!Array.isArray(images)) {
    throw new TypeError('Images must be an array')
  }

  return CONDITIONS.map(condition => {
    const conditionImages = images.filter(
      image => (image.condition || 'normal') === condition
    )

    const yoloImages = conditionImages
      .filter(image => !image.yolo?.error)
      .map(image => ({
        id: image.id,
        groundTruth: image.groundTruth || [],
        predictions: image.yoloPredictions || []
      }))

    const cocoImages = conditionImages
      .filter(image => !image.coco?.error)
      .map(image => ({
        id: image.id,
        groundTruth: image.groundTruth || [],
        predictions: image.cocoPredictions || []
      }))

    return {
      condition,
      imageCount: conditionImages.length,

      yolo: yoloImages.length
        ? evaluateModelDataset(yoloImages)
        : null,

      coco: cocoImages.length
        ? evaluateModelDataset(cocoImages)
        : null
    }
  }).filter(item => item.imageCount > 0)
}
