
import { useState } from 'react'

function MetricCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  )
}

export default function CrossModelDashboard({ report }) {
  const [selectedImage, setSelectedImage] = useState('all')

  const analysis = report?.crossModelVerification

  if (!analysis) return null

  const summary = analysis.summary
  const perImage = analysis.perImage || []

  const visibleImages = selectedImage === 'all'
    ? perImage
    : perImage.filter(
        image => String(image.imageId) === selectedImage
      )

  const formatPercent = value => `${Number(value || 0).toFixed(1)}%`

  return (
    <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-slate-950 p-4 sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
          Phase 7C
        </p>
        <h3 className="mt-1 text-xl font-bold text-white">
          Cross-Model Verification
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Compare YOLOv10s and COCO-SSD predictions using IoU-based
          object matching.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Agreement rate"
          value={formatPercent(summary.agreementRate)}
          description="Same-class matched detections"
        />
        <MetricCard
          label="Matched detections"
          value={summary.matchedDetections}
          description="Objects matched across models"
        />
        <MetricCard
          label="Class disagreements"
          value={summary.classDisagreements}
          description="Matched objects with different classes"
        />
        <MetricCard
          label="Unmatched detections"
          value={summary.yoloOnly + summary.cocoOnly}
          description="Detections found by only one model"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="YOLOv10s detections"
          value={summary.yoloDetections}
          description={`${summary.yoloOnly} unmatched detections`}
        />
        <MetricCard
          label="COCO-SSD detections"
          value={summary.cocoDetections}
          description={`${summary.cocoOnly} unmatched detections`}
        />
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Filter by dataset image
        </label>
        <select
          value={selectedImage}
          onChange={event => setSelectedImage(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white"
        >
          <option value="all">All evaluated images</option>
          {perImage.map((image, index) => (
            <option
              key={`${image.imageId}-${index}`}
              value={String(image.imageId)}
            >
              {image.imageName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-4">
        {visibleImages.map((image, index) => (
          <div
            key={`${image.imageId}-${index}`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <h4 className="font-semibold text-white">
              {image.imageName}
            </h4>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Agreements', image.summary.agreements],
                ['Class disagreements', image.summary.classDisagreements],
                ['YOLO only', image.summary.yoloOnly],
                ['COCO only', image.summary.cocoOnly]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-800 p-3">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {image.matches.length > 0 && (
              <div className="mt-4">
                <h5 className="mb-2 text-sm font-semibold text-emerald-300">
                  Matched detections
                </h5>

                <div className="space-y-2">
                  {image.matches.map((match, matchIndex) => (
                    <div
                      key={matchIndex}
                      className="rounded-lg bg-slate-800 p-3 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-slate-200">
                          YOLO: {match.yolo.class}
                          {' / '}
                          COCO: {match.coco.class}
                        </span>
                        <span className={
                          match.classAgreement
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }>
                          {match.classAgreement
                            ? 'Class agreement'
                            : 'Class disagreement'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>IoU: {match.iou.toFixed(3)}</span>
                        <span>
                          YOLO confidence: {formatPercent(match.yolo.score * 100)}
                        </span>
                        <span>
                          COCO confidence: {formatPercent(match.coco.score * 100)}
                        </span>
                        <span>
                          Confidence difference: {formatPercent(match.confidenceDifference * 100)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(image.yoloOnly.length > 0 || image.cocoOnly.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <h5 className="text-sm font-semibold text-sky-300">
                    YOLO-only detections
                  </h5>
                  {image.yoloOnly.map((item, itemIndex) => (
                    <p key={itemIndex} className="mt-2 text-xs text-slate-400">
                      {item.class} · {formatPercent(item.score * 100)}
                    </p>
                  ))}
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-violet-300">
                    COCO-only detections
                  </h5>
                  {image.cocoOnly.map((item, itemIndex) => (
                    <p key={itemIndex} className="mt-2 text-xs text-slate-400">
                      {item.class} · {formatPercent(item.score * 100)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {visibleImages.length === 0 && (
          <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
            No successfully evaluated images are available.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Matching IoU threshold: {analysis.iouThreshold}
      </p>
    </section>
  )
}
