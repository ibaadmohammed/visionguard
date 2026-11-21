function Metric({ label, value }) {
  return <div className="rounded-xl bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{Number(value || 0).toFixed(2)}%</p></div>
}

function ModelPanel({ title, result, speed, tone }) {
  if (!result) return null
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
    <div className="flex items-center justify-between gap-2"><h4 className={`font-bold ${tone}`}>{title}</h4><span className="text-xs text-slate-400">{speed ? `${speed.toFixed(1)} ms/image` : 'Speed unavailable'}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label="Precision" value={result.precision}/><Metric label="Recall" value={result.recall}/><Metric label="F1-score" value={result.f1}/><Metric label="mAP@50" value={result.mAP50}/><Metric label="mAP@50:95" value={result.mAP5095}/><Metric label="Images" value={result.images}/></div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-slate-900 p-2"><b className="text-emerald-300">{result.tp}</b><p className="text-xs text-slate-500">TP</p></div><div className="rounded-lg bg-slate-900 p-2"><b className="text-rose-300">{result.fp}</b><p className="text-xs text-slate-500">FP</p></div><div className="rounded-lg bg-slate-900 p-2"><b className="text-amber-300">{result.fn}</b><p className="text-xs text-slate-500">FN</p></div></div>
    <h5 className="mt-5 text-sm font-semibold">Per-class metrics</h5>
    <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-slate-500"><tr>{['Class','GT','Pred','TP','FP','FN','Precision','Recall','F1','AP50','AP50:95'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{result.perClass.map(row => <tr key={row.class} className="border-t border-slate-800"><td className="px-2 py-2 capitalize">{row.class}</td>{[row.groundTruth,row.predictions,row.tp,row.fp,row.fn,row.precision,row.recall,row.f1,row.ap50,row.map5095].map((value,index) => <td key={index} className="px-2 py-2">{index < 5 ? value : Number(value).toFixed(1)}</td>)}</tr>)}</tbody></table></div>
  </div>
}

export default function DatasetEvaluationDashboard({ report }) {
  if (!report) return null
  return <section className="rounded-2xl border border-violet-400/20 bg-slate-900 p-5 sm:p-6 space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Evaluation results</p><h3 className="mt-1 text-xl font-bold">Dataset model comparison</h3><p className="mt-1 text-sm text-slate-400">Metrics use IoU 0.50 for TP/FP/FN and 101-point interpolated AP across IoU 0.50–0.95 for mAP.</p></div>
    <div className="grid gap-4 lg:grid-cols-2"><ModelPanel title="YOLOv10s" result={report.evaluation.yolo} speed={report.speed.yolo} tone="text-emerald-300"/><ModelPanel title="COCO-SSD MobileNet V2" result={report.evaluation.coco} speed={report.speed.coco} tone="text-sky-300"/></div>
    <div className="rounded-xl bg-slate-950 p-4"><h4 className="font-semibold">Dataset run summary</h4><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-slate-500">Images processed</p><p className="mt-1 text-xl font-bold">{report.processedImages}/{report.totalImages}</p></div><div><p className="text-xs text-slate-500">Ground-truth boxes</p><p className="mt-1 text-xl font-bold">{report.totalGroundTruth}</p></div><div><p className="text-xs text-slate-500">YOLO mean latency</p><p className="mt-1 text-xl font-bold">{report.speed.yolo.toFixed(1)} ms</p></div><div><p className="text-xs text-slate-500">COCO mean latency</p><p className="mt-1 text-xl font-bold">{report.speed.coco.toFixed(1)} ms</p></div></div></div>
    <div className="rounded-xl bg-slate-950 p-4">
      <h4 className="font-semibold">Per-image inference results</h4>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-slate-500"><tr>{['Image','GT boxes','YOLO detections','YOLO ms','COCO detections','COCO ms','Status'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{report.imageResults.map(image => <tr key={image.id} className="border-t border-slate-800"><td className="max-w-40 truncate px-2 py-2" title={image.name}>{image.name}</td><td className="px-2 py-2">{image.groundTruth.length}</td><td className="px-2 py-2">{image.yolo?.detections ?? '—'}</td><td className="px-2 py-2">{image.yolo?.inferenceMs?.toFixed(1) ?? '—'}</td><td className="px-2 py-2">{image.coco?.detections ?? '—'}</td><td className="px-2 py-2">{image.coco?.inferenceMs?.toFixed(1) ?? '—'}</td><td className="px-2 py-2">{image.yolo?.error || image.coco?.error ? <span className="text-amber-300">Partial failure</span> : <span className="text-emerald-300">Complete</span>}</td></tr>)}</tbody></table></div>
    </div>
    {report.imageResults.some(item => item.yolo?.error || item.coco?.error) && <div className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">Some images failed inference. Their errors are included in the downloadable JSON report.</div>}
  </section>
}
