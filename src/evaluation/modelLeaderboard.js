
function clamp(value) {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

export function generateModelLeaderboard(report) {
  if (!report?.evaluation) {
    return {
      winner: null,
      models: []
    }
  }

  const modelData = [
    {
      name: 'YOLOv10s',
      key: 'yolo',
      metrics: report.evaluation.yolo,
      inferenceMs: report.speed?.yolo
    },
    {
      name: 'COCO-SSD',
      key: 'coco',
      metrics: report.evaluation.coco,
      inferenceMs: report.speed?.coco
    }
  ]

  const validModels = modelData.filter(
    model => model.metrics
  )

  const availableTimes = validModels
    .map(model => Number(model.inferenceMs))
    .filter(time => Number.isFinite(time) && time > 0)

  const fastestTime = availableTimes.length
    ? Math.min(...availableTimes)
    : null

  const results = validModels.map(model => {
    const metrics = model.metrics
    const inferenceMs = Number(model.inferenceMs)

    const speedScore =
      fastestTime && Number.isFinite(inferenceMs) && inferenceMs > 0
        ? (fastestTime / inferenceMs) * 100
        : 0

    const score =
      clamp(metrics.mAP50) * 0.30 +
      clamp(metrics.mAP5095) * 0.25 +
      clamp(metrics.f1) * 0.20 +
      clamp(metrics.precision) * 0.10 +
      clamp(metrics.recall) * 0.10 +
      clamp(speedScore) * 0.05

    return {
      name: model.name,
      key: model.key,
      score,
      mAP50: metrics.mAP50 ?? 0,
      mAP5095: metrics.mAP5095 ?? 0,
      precision: metrics.precision ?? 0,
      recall: metrics.recall ?? 0,
      f1: metrics.f1 ?? 0,
      inferenceMs: Number.isFinite(inferenceMs)
        ? inferenceMs
        : null,
      speedScore
    }
  })

  results.sort((a, b) => b.score - a.score)

  results.forEach((model, index) => {
    model.rank = index + 1
  })

  return {
    winner: results[0]?.name ?? null,
    models: results,
    scoringWeights: {
      mAP50: 30,
      mAP5095: 25,
      f1: 20,
      precision: 10,
      recall: 10,
      speed: 5
    }
  }
}
