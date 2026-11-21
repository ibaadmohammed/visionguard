import { useRef, useState } from 'react'
import { parseCocoAnnotations, parseYoloAnnotations, parseClassNames } from '../utils/annotationParser'

export default function AnnotationImporter({ images, onImported }) {
  const [format, setFormat] = useState('coco')
  const [classText, setClassText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  async function importFiles(event) {
    const files = Array.from(event.target.files || [])
    setStatus('')
    if (!images.length) { setStatus('Upload dataset images before importing annotations.'); return }
    setBusy(true)
    try {
      let result
      if (format === 'coco') {
        const file = files[0]
        if (!file || !file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a COCO instances JSON file.')
        result = parseCocoAnnotations(JSON.parse(await file.text()), images)
      } else {
        const txtFiles = files.filter(file => file.name.toLowerCase().endsWith('.txt'))
        if (!txtFiles.length) throw new Error('Choose one or more YOLO .txt annotation files.')
        const parsedFiles = await Promise.all(txtFiles.map(async file => ({ name: file.name, text: await file.text() })))
        result = parseYoloAnnotations(parsedFiles, images, parseClassNames(classText))
      }
      const attached = images.map(image => ({ ...image, groundTruth: result.annotations.has(image.id) ? result.annotations.get(image.id) : undefined }))
      onImported(attached)
      const warning = result.errors?.length ? ` ${result.errors.length} invalid line(s): ${result.errors.slice(0, 3).join(' | ')}` : ''
      setStatus(`Imported ${result.annotationCount} boxes across ${result.matchedImages} matched image(s).${result.unmatchedImages?.length ? ` Images without annotation files: ${result.unmatchedImages.join(', ')}` : ''}${result.unmatchedAnnotationFiles?.length ? ` Annotation image names not found: ${result.unmatchedAnnotationFiles.join(', ')}` : ''}${warning}`)
    } catch (error) {
      setStatus(error.message || 'Could not import annotations.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 space-y-4">
    <div><h3 className="text-lg font-bold">Ground-truth annotation importer</h3><p className="mt-1 text-sm text-slate-400">Match annotation records to uploaded images by filename.</p></div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setFormat('coco')} className={`rounded-lg px-4 py-2 text-sm ${format === 'coco' ? 'bg-violet-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>COCO JSON</button>
      <button type="button" onClick={() => setFormat('yolo')} className={`rounded-lg px-4 py-2 text-sm ${format === 'yolo' ? 'bg-violet-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>YOLO TXT</button>
    </div>
    {format === 'yolo' && <div><label className="text-xs text-slate-400">Class names (one per line, in class-ID order; optional)</label><textarea value={classText} onChange={event => setClassText(event.target.value)} placeholder={'person\ncar\ndog'} className="mt-2 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /></div>}
    <input ref={inputRef} type="file" multiple={format === 'yolo'} accept={format === 'coco' ? '.json,application/json' : '.txt,text/plain'} onChange={importFiles} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950" />
    <p className="text-xs text-slate-500">COCO expects image file names and pixel xywh boxes. YOLO expects one .txt file per image with normalized class x_center y_center width height rows. Missing class names become class_0, class_1, etc.</p>
    {busy && <p className="text-sm text-violet-300">Reading annotations…</p>}
    {status && <p className="whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-300">{status}</p>}
  </section>
}
