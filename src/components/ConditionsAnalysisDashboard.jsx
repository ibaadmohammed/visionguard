
const CONDITIONS = {
  normal: 'Normal',
  low_light: 'Low Light',
  blur: 'Blur',
  occlusion: 'Occlusion',
  crowded: 'Crowded'
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">
        {Number(value || 0).toFixed(2)}%
      </p>
    </div>
  )
}

function ModelMetrics({ name, evaluation }) {
  if (!evaluation) {
    return (
      <p className="text-sm text-slate-500">
        No evaluation available.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-white">{name}</h4>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Precision" value={evaluation.precision} />
        <Metric label="Recall" value={evaluation.recall} />
        <Metric label="F1 Score" value={evaluation.f1} />
        <Metric label="mAP@0.5" value={evaluation.mAP50} />
        <Metric label="mAP@0.5:0.95" value={evaluation.mAP5095} />
      </div>

      <p className="text-xs text-slate-400">
        Images evaluated: {evaluation.images}
      </p>
    </div>
  )
}

export default function ConditionAnalysisDashboard({ report }) {
  const conditions = report?.conditionAnalysis || []

  if (conditions.length === 0) {
    return null
  }

  return (
    <section className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">
          Difficult Condition Analysis
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Compare YOLO and COCO performance across different image conditions.
        </p>
      </div>

      {conditions.map(condition => (
        <article
          key={condition.condition}
          className="space-y-4 rounded-xl border border-white/10 bg-slate-950/60 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">
              {CONDITIONS[condition.condition] || condition.condition}
            </h3>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {condition.imageCount} images
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ModelMetrics
              name="YOLOv10s"
              evaluation={condition.yolo}
            />

            <ModelMetrics
              name="COCO-SSD"
              evaluation={condition.coco}
            />
          </div>
        </article>
      ))}
    </section>
  )
}
