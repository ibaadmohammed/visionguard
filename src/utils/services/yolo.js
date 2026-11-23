import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env
} from '@xenova/transformers'

const YOLO_MODEL_ID = 'onnx-community/yolov10s'
// Browser model-loading configuration
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = false
let yoloResourcesPromise = null

// --------------------------------------------------
// SHARED MODEL LOADER
// --------------------------------------------------

export function loadYoloModel() {
  if (!yoloResourcesPromise) {
    yoloResourcesPromise = Promise.all([
      AutoModel.from_pretrained(YOLO_MODEL_ID),
      AutoProcessor.from_pretrained(YOLO_MODEL_ID)
    ])
      .then(([model, processor]) => ({
        model,
        processor
      }))
      .catch(error => {
        yoloResourcesPromise = null
        throw error
      })
  }

  return yoloResourcesPromise
}

// --------------------------------------------------
// CONVERT INPUT INTO RAW IMAGE
// --------------------------------------------------

async function prepareImage(input) {
  if (typeof input === 'string' || input instanceof URL) {
    return await RawImage.read(input)
  }

  if (
    typeof HTMLCanvasElement !== 'undefined' &&
    input instanceof HTMLCanvasElement
  ) {
    return RawImage.fromCanvas(input)
  }

  if (
    typeof HTMLImageElement !== 'undefined' &&
    input instanceof HTMLImageElement
  ) {
    if (!input.complete || !input.naturalWidth) {
      throw new Error('Image is not ready for detection.')
    }
  } else if (
    typeof HTMLVideoElement !== 'undefined' &&
    input instanceof HTMLVideoElement
  ) {
    if (input.readyState < 2 || !input.videoWidth) {
      throw new Error('Video frame is not ready for detection.')
    }
  } else {
    throw new Error('Unsupported YOLO image input.')
  }

  const isVideo = input instanceof HTMLVideoElement

  const width = isVideo
    ? input.videoWidth
    : input.naturalWidth

  const height = isVideo
    ? input.videoHeight
    : input.naturalHeight

  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to prepare image for YOLO detection.')
  }

  context.drawImage(input, 0, 0, width, height)

  return await RawImage.fromBlob(
  await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png')
  })
)
}

// --------------------------------------------------
// YOLOv10 INFERENCE
// --------------------------------------------------

export async function detectWithYolo(
  input,
  threshold = 0.25
) {
  const { model, processor } = await loadYoloModel()

  const image = await prepareImage(input)

  const {
    pixel_values,
    reshaped_input_sizes
  } = await processor(image)

  const { output0 } = await model({
    images: pixel_values
  })

  if (!output0 || !reshaped_input_sizes?.[0]) {
    throw new Error('YOLOv10 returned an invalid output.')
  }

  const predictions = output0.tolist()[0]

  const [newHeight, newWidth] = reshaped_input_sizes[0]

  const scaleX = image.width / newWidth
  const scaleY = image.height / newHeight

  return predictions
    .filter(item => Number(item[4]) >= threshold)
    .map(([xmin, ymin, xmax, ymax, score, classId]) => {
      const left = xmin * scaleX
      const top = ymin * scaleY
      const right = xmax * scaleX
      const bottom = ymax * scaleY

      return {
        class: String(
          model.config.id2label[classId] || `class_${classId}`
        ).trim().toLowerCase(),

        score: Number(score),

        bbox: [
          left,
          top,
          right - left,
          bottom - top
        ]
      }
    })
    .filter(item =>
      item.class &&
      Number.isFinite(item.score) &&
      item.bbox.every(Number.isFinite) &&
      item.bbox[2] > 0 &&
      item.bbox[3] > 0
    )
}
