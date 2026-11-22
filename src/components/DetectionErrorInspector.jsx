
import { useMemo, useState } from 'react'

const COLORS = {
  TP: '#34d399',
  FP: '#fb7185',
  FN: '#fb923c'
}

function formatConfidence(score) {
  return Number.isFinite(score)
    ? `${(score * 100).toFixed(1)}%`
    : 'N/A'
}

export default function DetectionErrorInspector({ report }) {
  const [selectedImageId, setSelectedImageId] = useState('')
  const [selectedModel, setSelectedModel] = useState('yolo')
  const [imageDimensions, setImageDimensions] = useState(null)

  const imageResults = report?.imageResults || []

  const modelResults =
    report?.evaluation?.[selectedModel]?.errorAnalysis

  const availableImages = useMemo(() => {
    return imageResults.filter(image =>
      modelResults?.perImage?.some(
        result => result.imageId === image.id
      )
    )
  }, [imageResults, modelResults])

  const activeImageId =
    availableImages.some(image => image.id === selectedImageId)
      ? selectedImageId
      : availableImages[0]?.id ?? ''

  const selectedImage = availableImages.find(
    image => image.id === activeImageId
  )

  const imageAnalysis = modelResults?.perImage?.find(
    image => image.imageId === activeImageId
  )

  const detections = [
    ...(imageAnalysis?.truePositiveResults || []).map(item => ({
      ...item,
      type: 'TP'
    })),
    ...(imageAnalysis?.falsePositiveResults || []).map(item => ({
      ...item,
      type: 'FP'
    })),
    ...(imageAnalysis?.falseNegativeResults || []).map(item => ({
      ...item,
      type: 'FN'
    }))
  ]

  const counts = {
    TP: imageAnalysis?.truePositives || 0,
    FP: imageAnalysis?.falsePositives || 0,
    FN: imageAnalysis?.falseNegatives || 0
  }

  if (!imageResults.length || !report?.evaluation) return null

  return (
    <section className="rounded-2xl border border-rose-400/20 bg-slate-950 p-4 sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">
          Phase 7B
        </p>
        <h4 className="mt-1 text-lg font-bold">
          Detection Error Inspector
        </h4>
        <p className="mt-1 text-sm text-slate-400">
          Inspect true positives, false positives and missed objects
          image by image.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Detection model
          </label>
          <select
            value={selectedModel}
            onChange={event => {
              setSelectedModel(event.target.value)
              setSelectedImageId('')
              setImageDimensions(null)
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white"
          >
            <option value="yolo">YOLOv10s</option>
            <option value="coco">COCO-SSD MobileNet V2</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Dataset image
          </label>
          <select
            value={activeImageId}
            onChange={event => {
              setSelectedImageId(event.target.value)
              setImageDimensions(null)
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white"
          >
            {availableImages.map(image => (
              <option key={image.id} value={image.id}>
                {image.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { key: 'TP', label: 'True Positives' },
          { key: 'FP', label: 'False Positives' },
          { key: 'FN', label: 'False Negatives' }
        ].map(item => (
          <div
            key={item.key}
            className="rounded-xl bg-slate-900 p-3 text-center"
          >
            <p
              className="text-2xl font-bold"
              style={{ color: COLORS[item.key] }}
            >
              {counts[item.key]}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {selectedImage?.previewUrl ? (
        <div className="mt-5">
          <h5 className="mb-2 text-sm font-semibold">
            Annotated image: {selectedImage.name}
          </h5>

          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black">
            <img
              src={selectedImage.previewUrl}
              alt={`Detection errors in ${selectedImage.name}`}
              className="block h-auto w-full"
              onLoad={event => {
                setImageDimensions({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight
                })
              }}
            />

            {imageDimensions && (
              <svg
                viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                {detections.map((item, index) => {
                  const [x, y, width, height] = item.bbox || []

                  if (
                    ![x, y, width, height].every(Number.isFinite)
                  ) {
                    return null
                  }

                  const color = COLORS[item.type]
                  const label =
                    item.type === 'FN'
                      ? `FN ${item.class}`
                      : `${item.type} ${item.class} ${formatConfidence(item.score)}`

                  return (
                    <g key={`${item.type}-${index}`}>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={color}
                        fillOpacity="0.10"
                        stroke={color}
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        x={x}
                        y={Math.max(14, y - 4)}
                        fill={color}
                        fontSize="15"
                        fontWeight="bold"
                        stroke="#020617"
                        strokeWidth="3"
                        paintOrder="stroke"
                      >
                        {label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-slate-900 p-5 text-sm text-slate-400">
          {selectedImage
            ? 'Image preview is unavailable.'
            : 'No successfully evaluated images are available for this model.'}
        </div>
      )}

      <div className="mt-5">
        <h5 className="text-sm font-semibold">Detection details</h5>

        {detections.length > 0 ? (
          <div className="mt-2 space-y-2">
            {detections.map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm"
              >
                <div>
                  <span
                    className="font-bold"
                    style={{ color: COLORS[item.type] }}
                  >
                    {item.type}
                  </span>
                  <span className="ml-2 capitalize text-slate-200">
                    {item.class}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.errorType?.replaceAll('_', ' ') ||
                      (item.type === 'FN'
                        ? 'Missed detection'
                        : 'Correct detection')}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-400">
                  {item.type !== 'FN' && (
                    <p>Confidence: {formatConfidence(item.score)}</p>
                  )}
                  <p>
                    IoU: {Number(item.iou || 0).toFixed(3)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-lg bg-slate-900 p-4 text-sm text-slate-400">
            No detections or errors found for this image.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {Object.entries(COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {key === 'TP'
              ? 'True Positive'
              : key === 'FP'
                ? 'False Positive'
                : 'False Negative'}
          </span>
        ))}
      </div>
    </section>
  )
}
