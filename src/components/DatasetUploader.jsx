
import { useRef, useState } from 'react'

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
]

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_DATASET_SIZE = 100

export default function DatasetUploader({
  images = [],
  onImagesAdded
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function getImageDetails(file) {
    const previewUrl = URL.createObjectURL(file)

    return new Promise((resolve, reject) => {
      const image = new Image()

      image.onload = () => {
        resolve({
          id: globalThis.crypto?.randomUUID?.() || `dataset-${Date.now()}-${Math.random().toString(36).slice(2)}`, 
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
          width: image.naturalWidth,
          height: image.naturalHeight
        })
      }

      image.onerror = () => {
        URL.revokeObjectURL(previewUrl)
        reject(new Error(`Unable to read ${file.name}`))
      }

      image.src = previewUrl
    })
  }

  async function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files || [])

    setError('')
    setLoading(true)

    const acceptedImages = []
    const errors = []
    const seenFiles = new Set(images.map(image => `${image.name}|${image.size}|${image.file.lastModified}`))

    const remainingSlots = Math.max(
      0,
      MAX_DATASET_SIZE - images.length
    )

    for (const file of selectedFiles) {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported format`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 20 MB`)
        continue
      }

      const signature = `${file.name}|${file.size}|${file.lastModified}`
      const duplicate = seenFiles.has(signature)

      if (duplicate) {
        errors.push(`${file.name}: already uploaded`)
        continue
      }

      if (acceptedImages.length >= remainingSlots) {
        errors.push('Dataset limit is 100 images')
        break
      }

      try {
        const image = await getImageDetails(file)
        acceptedImages.push(image)
        seenFiles.add(signature)
      } catch {
        errors.push(`${file.name}: could not be loaded`)
      }
    }

    if (acceptedImages.length > 0) {
      onImagesAdded?.(acceptedImages)
    }

    setError(errors.join('\n'))
    setLoading(false)

    // Allow selecting the same file again after removal.
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Dataset Upload
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Upload multiple images for object detection evaluation.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
        id="dataset-file-input"
      />

      <label
        htmlFor="dataset-file-input"
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-600 p-10 text-center transition hover:border-blue-500 hover:bg-slate-800"
      >
        <span className="text-4xl">📁</span>

        <span className="mt-3 font-medium text-white">
          Click to upload dataset images
        </span>

        <span className="mt-2 text-sm text-slate-400">
          JPG, PNG, WebP · Maximum 20 MB per image
        </span>
      </label>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-400">
        <span>{images.length} / {MAX_DATASET_SIZE} images uploaded</span>
        <span>Maximum 100 images</span>
      </div>

      {loading && (
        <p className="text-sm text-blue-400">
          Processing images...
        </p>
      )}

      {error && (
        <pre className="whitespace-pre-wrap rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </pre>
      )}
    </section>
  )
}
