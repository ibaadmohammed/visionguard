
import { useMemo, useState } from 'react'

function MetricCard({ title, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function BenchmarkPanel({ title, benchmark }) {
  const [filter, setFilter] = useState('all')

  if (!benchmark) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm text-slate-400">
          No benchmark results available.
        </p>
      </section>
    )
  }

  const imageResults = benchmark.imageResults || []

  const filteredImages = imageResults.filter(image =>
    filter === 'all' ? true : image.performance === filter
  )

  const format = value =>
    `${(Number(value) || 0).toFixed(2)}%`

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <h3 className="text-xl font-semibold text-white">{title}</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Average Image F1"
          value={format(benchmark.averageF1)}
        />
        <MetricCard
          title="Consistency Rate"
          value={format(benchmark.consistencyRate)}
        />
        <MetricCard
          title="Strong Images"
          value={benchmark.strongImages ?? 0}
        />
        <MetricCard
          title="Weak Images"
          value={benchmark.weakImages ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">Strong performance</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {benchmark.strongImages ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-300">Moderate performance</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {benchmark.moderateImages ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-300">Weak performance</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {benchmark.weakImages ?? 0}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-white">
          Image-level performance
        </h4>

        <select
          value={filter}
          onChange={event => setFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
        >
          <option value="all">All images</option>
          <option value="strong">Strong</option>
          <option value="moderate">Moderate</option>
          <option value="weak">Weak</option>
        </select>
      </div>

      {filteredImages.length === 0 ? (
        <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-400">
          No images match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Condition</th>
                <th className="p-3">TP</th>
                <th className="p-3">FP</th>
                <th className="p-3">FN</th>
                <th className="p-3">Precision</th>
                <th className="p-3">Recall</th>
                <th className="p-3">F1</th>
                <th className="p-3">Performance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 text-slate-300">
              {filteredImages.map((image, index) => (
                <tr key={`${image.id}-${index}`} className="hover:bg-slate-800/70">
                  <td className="p-3 font-medium text-white">
                    {image.name || `Image ${index + 1}`}
                  </td>
                  <td className="p-3">
                    {(image.condition || 'normal').replace('_', ' ')}
                  </td>
                  <td className="p-3">{image.tp}</td>
                  <td className="p-3">{image.fp}</td>
                  <td className="p-3">{image.fn}</td>
                  <td className="p-3">{format(image.precision)}</td>
                  <td className="p-3">{format(image.recall)}</td>
                  <td className="p-3 font-semibold text-white">
                    {format(image.f1)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        image.performance === 'strong'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : image.performance === 'weak'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {image.performance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function DatasetBenchmarkDashboard({ report }) {
  const evaluation = report?.evaluation

  const hasResults = useMemo(
    () =>
      Boolean(
        evaluation?.yolo?.datasetBenchmark ||
        evaluation?.coco?.datasetBenchmark
      ),
    [evaluation]
  )

  if (!report || !hasResults) {
    return null
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Dataset Benchmark Analysis
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Compare image-level detection quality and performance consistency
          across both models.
        </p>
      </div>

      {evaluation.yolo?.datasetBenchmark && (
        <BenchmarkPanel
          title="YOLOv10s Benchmark"
          benchmark={evaluation.yolo.datasetBenchmark}
        />
      )}

      {evaluation.coco?.datasetBenchmark && (
        <BenchmarkPanel
          title="COCO-SSD Benchmark"
          benchmark={evaluation.coco.datasetBenchmark}
        />
      )}
    </section>
  )
}
