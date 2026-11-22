

export default function DatasetPreview({
  images = [],
  onRemove,
  onClear,
  onConditionChange
}) {
  const conditions = [
    { value: 'normal', label: 'Normal' },
    { value: 'low_light', label: 'Low light' },
    { value: 'blur', label: 'Blurry' },
    { value: 'occlusion', label: 'Partially occluded' },
    { value: 'crowded', label: 'Crowded scene' }
  ]

  if (images.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white">
          Dataset Preview
        </h2>

        <p className="mt-3 text-sm text-slate-400">
          No images uploaded yet. Upload images to preview your dataset.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Dataset Preview
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {images.length} images ready for evaluation
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Clear Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image, index) => (
          <article
            key={image.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-slate-800"
          >
            <div className="relative aspect-video bg-slate-950">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="h-full w-full object-contain"
                loading="lazy"
              />

              <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                #{index + 1}
              </span>

              <button
                type="button"
                onClick={() => onRemove(image.id)}
                aria-label={`Remove ${image.name}`}
                className="absolute right-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>

            <div className="space-y-3 p-3">
              <p
                className="truncate text-sm font-medium text-white"
                title={image.name}
              >
                {image.name}
              </p>

              <p className="text-xs text-slate-400">
                {image.width} × {image.height}
              </p>

              <p className="text-xs text-slate-400">
                {(image.size / (1024 * 1024)).toFixed(2)} MB
              </p>

              <p className={`text-xs font-medium ${Array.isArray(image.groundTruth) ? 'text-emerald-300' : 'text-amber-300'}`}>
                {Array.isArray(image.groundTruth)
                  ? `${image.groundTruth.length} ground-truth box(es)`
                  : 'Annotations missing'}
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Image condition
                </label>

                <select
                  value={image.condition || 'normal'}
                  onChange={event =>
                    onConditionChange?.(image.id, event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-white"
                >
                  {conditions.map(condition => (
                    <option
                      key={condition.value}
                      value={condition.value}
                    >
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
