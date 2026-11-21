function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportDatasetJSON(report) {
  download(JSON.stringify(report, null, 2), 'visionguard-dataset-evaluation.json', 'application/json')
}

export function exportDatasetCSV(report) {
  const rows = [['model','image','inference_ms','detections','ground_truth','error']]
  for (const model of ['yolo', 'coco']) {
    for (const image of report.imageResults || []) {
      const predictionKey = model === 'yolo' ? 'yoloPredictions' : 'cocoPredictions'
      const detectionCount = image[model]?.detections ?? image[predictionKey]?.length ?? ''
      rows.push([model, image.name, image[model]?.inferenceMs ?? '', detectionCount, image.groundTruth?.length ?? '', image[model]?.error || ''])
    }
  }
  rows.push([])
  rows.push(['model','overall_TP','overall_FP','overall_FN','precision_percent','recall_percent','F1_percent','mAP50_percent','mAP50_95_percent'])
  for (const model of ['yolo', 'coco']) {
    const item = report.evaluation?.[model]
    if (item) rows.push([model, item.tp, item.fp, item.fn, item.precision, item.recall, item.f1, item.mAP50, item.mAP5095])
  }
  rows.push([])
  rows.push(['model','class','GT','predictions','TP','FP','FN','precision_percent','recall_percent','F1_percent','AP50_percent','mAP50_95_percent'])
  for (const model of ['yolo', 'coco']) {
    for (const item of report.evaluation?.[model]?.perClass || []) {
      rows.push([model,item.class,item.groundTruth,item.predictions,item.tp,item.fp,item.fn,item.precision.toFixed(4),item.recall.toFixed(4),item.f1.toFixed(4),item.ap50.toFixed(4),item.map5095.toFixed(4)])
    }
  }
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  download(csv, 'visionguard-dataset-evaluation.csv', 'text/csv;charset=utf-8')
}
