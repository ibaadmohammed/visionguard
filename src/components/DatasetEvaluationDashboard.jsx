
import DetectionErrorInspector from './DetectionErrorInspector'

function Metric({ label, value, suffix = '%' }) {
  return (
    <div className="rounded-xl bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">
        {Number(value || 0).toFixed(2)}{suffix}
      </p>
    </div>
  )
}

function ConfidenceAnalysis({ analysis }) {
  if (!analysis?.thresholds?.length) return null

  return (
    <div className="mt-5 rounded-xl border border-violet-400/20 bg-slate-950 p-4">
      <div>
        <h5 className="font-semibold text-violet-300">
          Confidence Threshold Analysis
        </h5>
        <p className="mt-1 text-xs text-slate-400">
          Performance across different confidence thresholds using IoU 0.50.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Best threshold"
          value={(analysis.bestThreshold * 100).toFixed(0)}
          suffix="%"
        />
        <Metric
          label="Best F1-score"
          value={analysis.bestMetrics?.f1}
        />
        <Metric
          label="Evaluated images"
          value={analysis.evaluatedImages}
          suffix=""
        />
      </div>

      <div className="mt-4 rounded-xl bg-slate-900 p-3">
<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
    <p className="text-xs text-emerald-300">Balanced recommendation</p>
    <p className="mt-2 text-2xl font-bold text-white">
      {((analysis.recommendations?.balanced ?? analysis.bestThreshold ?? 0) * 100).toFixed(0)}%
    </p>
    <p className="mt-1 text-xs text-slate-400">
      Best F1-score
    </p>
  </div>

  <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
    <p className="text-xs text-sky-300">Precision-focused</p>
    <p className="mt-2 text-2xl font-bold text-white">
      {((analysis.recommendations?.precisionFocused ?? analysis.bestThreshold ?? 0) * 100).toFixed(0)}%
    </p>
    <p className="mt-1 text-xs text-slate-400">
      Highest precision
    </p>
  </div>

  <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
    <p className="text-xs text-amber-300">Recall-focused</p>
    <p className="mt-2 text-2xl font-bold text-white">
      {((analysis.recommendations?.recallFocused ?? analysis.bestThreshold ?? 0) * 100).toFixed(0)}%
    </p>
    <p className="mt-1 text-xs text-slate-400">
      Highest recall
    </p>
  </div>
</div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            Best threshold performance
          </span>
          <span className="text-xs text-violet-300">
            {((analysis.bestThreshold ?? 0) * 100).toFixed(0)}% confidence
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-xs text-slate-500">Precision</p>
            <p className="mt-1 font-bold text-emerald-300">
              {Number(analysis.bestMetrics?.precision || 0).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Recall</p>
            <p className="mt-1 font-bold text-sky-300">
              {Number(analysis.bestMetrics?.recall || 0).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">F1-score</p>
            <p className="mt-1 font-bold text-violet-300">
              {Number(analysis.bestMetrics?.f1 || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <h6 className="mt-5 text-sm font-semibold">
        F1-score across confidence thresholds
      </h6>

      <div className="mt-3 space-y-3">
        {analysis.thresholds.map(row => {
          const isBest = row.threshold === analysis.bestThreshold
          const f1 = Math.max(0, Math.min(100, Number(row.f1) || 0))

          return (
            <div key={row.threshold}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={isBest ? 'font-bold text-violet-300' : 'text-slate-400'}>
                  {(row.threshold * 100).toFixed(0)}% confidence
                  {isBest ? ' · Best' : ''}
                </span>
                <span className="text-slate-300">
                  {f1.toFixed(2)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${isBest ? 'bg-violet-400' : 'bg-sky-500'}`}
                  style={{ width: `${f1}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <h6 className="mt-5 text-sm font-semibold">
        Detailed threshold metrics
      </h6>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              {['Threshold', 'Precision', 'Recall', 'F1-score', 'TP', 'FP', 'FN'].map(label => (
                <th key={label} className="px-2 py-2">{label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {analysis.thresholds.map(row => (
              <tr
                key={row.threshold}
                className={`border-t border-slate-800 ${
                  row.threshold === analysis.bestThreshold
                    ? 'bg-violet-400/10'
                    : ''
                }`}
              >
                <td className="px-2 py-2">
                  {(row.threshold * 100).toFixed(0)}%
                  {row.threshold === analysis.bestThreshold && (
                    <span className="ml-2 text-violet-300">Best</span>
                  )}
                </td>
                {[row.precision, row.recall, row.f1].map((value, index) => (
                  <td key={index} className="px-2 py-2">
                    {Number(value || 0).toFixed(2)}%
                  </td>
                ))}
                {[row.tp, row.fp, row.fn].map((value, index) => (
                  <td key={index} className="px-2 py-2">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModelPanel({ title, result, speed, tone, error }) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-slate-950 p-4">
        <h4 className={`font-bold ${tone}`}>{title}</h4>
        <p className="mt-3 text-sm text-rose-300">
          Model unavailable: {error}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          No performance metrics were calculated because the model did not load.
        </p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className={`font-bold ${tone}`}>{title}</h4>
        <span className="text-xs text-slate-400">
          {Number.isFinite(speed) ? `${speed.toFixed(1)} ms/image` : 'Speed unavailable'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Precision" value={result.precision} />
        <Metric label="Recall" value={result.recall} />
        <Metric label="F1-score" value={result.f1} />
        <Metric label="mAP@50" value={result.mAP50} />
        <Metric label="mAP@50:95" value={result.mAP5095} />
        <Metric label="Images" value={result.images} suffix="" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-900 p-2">
          <b className="text-emerald-300">{result.tp}</b>
          <p className="text-xs text-slate-500">TP</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-2">
          <b className="text-rose-300">{result.fp}</b>
          <p className="text-xs text-slate-500">FP</p>
        </div>
        <div className="rounded-lg bg-slate-900 p-2">
          <b className="text-amber-300">{result.fn}</b>
          <p className="text-xs text-slate-500">FN</p>
        </div>
      </div>

      <h5 className="mt-5 text-sm font-semibold">Per-class metrics</h5>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              {['Class', 'GT', 'Pred', 'TP', 'FP', 'FN', 'Precision', 'Recall', 'F1', 'AP50', 'AP50:95'].map(label => (
                <th key={label} className="px-2 py-2">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(result.perClass || []).map(row => (
              <tr key={row.class} className="border-t border-slate-800">
                <td className="px-2 py-2 capitalize">{row.class}</td>
                {[row.groundTruth, row.predictions, row.tp, row.fp, row.fn, row.precision, row.recall, row.f1, row.ap50, row.map5095].map((value, index) => (
                  <td key={index} className="px-2 py-2">
                    {index < 5 ? value : Number(value || 0).toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfidenceAnalysis analysis={result.confidenceAnalysis} />
    </div>
  )
}

export default function DatasetEvaluationDashboard({ report }) {
  if (!report) return null

  return (
    <section className="space-y-5 rounded-2xl border border-violet-400/20 bg-slate-900 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
          Evaluation results
        </p>
        <h3 className="mt-1 text-xl font-bold">Dataset model comparison</h3>
        <p className="mt-1 text-sm text-slate-400">
          Metrics use IoU 0.50 for TP/FP/FN and 101-point interpolated AP
          across IoU 0.50–0.95. Each model is scored only on images where
          its inference completed successfully.
        </p>
      </div>

      {report.modelLoadErrors &&
        (report.modelLoadErrors.yolo || report.modelLoadErrors.coco) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
            <h4 className="font-semibold">Model loading warning</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.modelLoadErrors.yolo && (
                <li>YOLOv10s: {report.modelLoadErrors.yolo}</li>
              )}
              {report.modelLoadErrors.coco && (
                <li>COCO-SSD: {report.modelLoadErrors.coco}</li>
              )}
            </ul>
            <p className="mt-2 text-xs text-amber-100/70">
              Metrics for a model that could not load are not a valid performance measurement.
            </p>
          </div>
        )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ModelPanel
          title="YOLOv10s"
          result={report.evaluation.yolo}
          speed={report.speed.yolo}
          tone="text-emerald-300"
          error={report.modelLoadErrors?.yolo}
        />
        <ModelPanel
          title="COCO-SSD MobileNet V2"
          result={report.evaluation.coco}
          speed={report.speed.coco}
          tone="text-sky-300"
          error={report.modelLoadErrors?.coco}
        />
      </div>

      {/* Phase 7B: False Positive / False Negative Inspector */}
      <DetectionErrorInspector report={report} />

      <div className="rounded-xl bg-slate-950 p-4">
        <h4 className="font-semibold">Dataset run summary</h4>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Images processed</p>
            <p className="mt-1 text-xl font-bold">
              {report.processedImages}/{report.totalImages}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Ground-truth boxes</p>
            <p className="mt-1 text-xl font-bold">{report.totalGroundTruth}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">YOLO mean latency</p>
            <p className="mt-1 text-xl font-bold">
              {Number(report.speed.yolo || 0).toFixed(1)} ms
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">COCO mean latency</p>
            <p className="mt-1 text-xl font-bold">
              {Number(report.speed.coco || 0).toFixed(1)} ms
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-950 p-4">
        <h4 className="font-semibold">Per-image inference results</h4>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                {['Image', 'GT boxes', 'YOLO detections', 'YOLO ms', 'COCO detections', 'COCO ms', 'Status'].map(label => (
                  <th key={label} className="px-2 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report.imageResults || []).map(image => (
                <tr key={image.id} className="border-t border-slate-800">
                  <td className="max-w-40 truncate px-2 py-2" title={image.name}>
                    {image.name}
                  </td>
                  <td className="px-2 py-2">{image.groundTruth.length}</td>
                  <td className="px-2 py-2">{image.yolo?.detections ?? '—'}</td>
                  <td className="px-2 py-2">{image.yolo?.inferenceMs?.toFixed(1) ?? '—'}</td>
                  <td className="px-2 py-2">{image.coco?.detections ?? '—'}</td>
                  <td className="px-2 py-2">{image.coco?.inferenceMs?.toFixed(1) ?? '—'}</td>
                  <td className="px-2 py-2">
                    {image.yolo?.error || image.coco?.error ? (
                      <span className="text-amber-300">Partial failure</span>
                    ) : (
                      <span className="text-emerald-300">Complete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.imageResults?.some(item => item.yolo?.error || item.coco?.error) && (
        <div className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">
          Some images failed inference. Failed images are excluded from that
          model's metrics rather than being counted as false negatives.
          Their errors are included in the downloadable JSON report.
        </div>
      )}
    </section>
  )
}
