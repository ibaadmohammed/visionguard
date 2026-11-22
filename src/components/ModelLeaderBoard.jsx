
function format(value) {
  return `${(Number(value) || 0).toFixed(2)}%`
}

export default function ModelLeaderboard({ report }) {
  const leaderboard = report?.modelLeaderboard

  if (!leaderboard?.models?.length) {
    return null
  }

  const winner = leaderboard.winner

  return (
    <section className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div>
        <h2 className="text-2xl font-bold text-white">
          AI Model Leaderboard
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Performance rankings based on accuracy, detection quality,
          and inference speed.
        </p>
      </div>

      <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-4">
        <p className="text-sm text-violet-300">
          Overall winning model
        </p>
        <p className="mt-2 text-2xl font-bold text-white">
          {winner || 'No winner'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Based on the project's weighted evaluation score.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {leaderboard.models.map(model => (
          <div
            key={model.key}
            className={`rounded-xl border p-4 ${
              model.name === winner
                ? 'border-emerald-400/40 bg-emerald-400/5'
                : 'border-white/10 bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">
                  Rank #{model.rank}
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {model.name}
                </h3>
              </div>

              {model.name === winner && (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Winner
                </span>
              )}
            </div>

            <div className="mt-5">
              <p className="text-sm text-slate-400">
                Overall score
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {format(model.score)}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{
                    width: `${Math.min(100, Math.max(0, model.score))}%`
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['mAP@0.5', model.mAP50],
                ['mAP@0.5:0.95', model.mAP5095],
                ['Precision', model.precision],
                ['Recall', model.recall],
                ['F1-score', model.f1]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-slate-950 p-3"
                >
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 font-semibold text-white">
                    {format(value)}
                  </p>
                </div>
              ))}

              <div className="rounded-lg bg-slate-950 p-3">
                <p className="text-xs text-slate-400">
                  Inference time
                </p>
                <p className="mt-1 font-semibold text-white">
                  {model.inferenceMs !== null
                    ? `${model.inferenceMs.toFixed(2)} ms`
                    : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-800 p-4">
        <h3 className="font-semibold text-white">
          Ranking methodology
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          mAP@0.5: 30% · mAP@0.5:0.95: 25% · F1: 20% ·
          Precision: 10% · Recall: 10% · Speed: 5%.
        </p>
      </div>
    </section>
  )
}
