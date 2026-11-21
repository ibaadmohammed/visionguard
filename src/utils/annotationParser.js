const basename = value => String(value || '').replace(/\\/g, '/').split('/').pop().toLowerCase()

function validBox(box) {
  return Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0
}

export function parseCocoAnnotations(json, images) {
  if (!json || !Array.isArray(json.images) || !Array.isArray(json.annotations) || !Array.isArray(json.categories)) {
    throw new Error('Invalid COCO JSON. Expected images, annotations and categories arrays.')
  }
  const imageById = new Map(json.images.map(item => [item.id, item]))
  const categoryById = new Map(json.categories.map(item => [item.id, String(item.name || `class_${item.id}`).trim().toLowerCase()]))
  const imported = new Map()
  const unmatched = []
  for (const localImage of images) {
    const match = json.images.find(item => basename(item.file_name) === basename(localImage.name))
    if (match) imported.set(localImage.id, [])
  }
  for (const annotation of json.annotations) {
    const sourceImage = imageById.get(annotation.image_id)
    if (!sourceImage) continue
    const localImage = images.find(item => basename(item.name) === basename(sourceImage.file_name))
    if (!localImage) { unmatched.push(sourceImage.file_name); continue }
    const category = categoryById.get(annotation.category_id)
    const rawBox = Array.isArray(annotation.bbox) ? annotation.bbox.map(Number) : []
    if (!category || !validBox(rawBox)) continue
    const scaleX = Number(sourceImage.width) > 0 ? localImage.width / Number(sourceImage.width) : 1
    const scaleY = Number(sourceImage.height) > 0 ? localImage.height / Number(sourceImage.height) : 1
    const bbox = [rawBox[0] * scaleX, rawBox[1] * scaleY, rawBox[2] * scaleX, rawBox[3] * scaleY]
    imported.get(localImage.id).push({ class: category, bbox, score: 1 })
  }
  const matchedCount = imported.size
  const unmatchedLocalImages = images.filter(item => !imported.has(item.id)).map(item => item.name)
  return { annotations: imported, matchedImages: matchedCount, unmatchedImages: unmatchedLocalImages, unmatchedAnnotationFiles: [...new Set(unmatched)], annotationCount: [...imported.values()].reduce((sum, items) => sum + items.length, 0) }
}

export function parseYoloAnnotations(files, images, classNames = []) {
  const imported = new Map()
  const errors = []
  let annotationCount = 0
  let matchedFiles = 0
  for (const file of files) {
    const stem = basename(file.name).replace(/\.txt$/i, '')
    const image = images.find(item => basename(item.name).replace(/\.[^.]+$/, '') === stem)
    if (!image) { errors.push(`${file.name}: no matching image found`); continue }
    matchedFiles++
    if (!imported.has(image.id)) imported.set(image.id, [])
    const lines = (file.text || '').split(/\r?\n/)
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return
      const parts = trimmed.split(/\s+/).map(Number)
      if (parts.length !== 5 || parts.some(value => !Number.isFinite(value))) {
        errors.push(`${file.name}:${index + 1}: expected class x_center y_center width height`)
        return
      }
      const [classId, cx, cy, width, height] = parts
      if (!Number.isInteger(classId) || classId < 0 || width <= 0 || height <= 0 || cx < 0 || cy < 0 || cx > 1 || cy > 1 || width > 1 || height > 1) {
        errors.push(`${file.name}:${index + 1}: invalid class ID or normalized coordinates`)
        return
      }
      const x = (cx - width / 2) * image.width
      const y = (cy - height / 2) * image.height
      const bbox = [x, y, width * image.width, height * image.height]
      if (!validBox(bbox) || x < 0 || y < 0 || x + bbox[2] > image.width + 1 || y + bbox[3] > image.height + 1) { errors.push(`${file.name}:${index + 1}: bounding box is outside the image`); return }
      imported.get(image.id).push({ class: String(classNames[classId] || `class_${classId}`).trim().toLowerCase(), bbox, score: 1 })
      annotationCount++
    })
  }
  const unmatchedImages = images.filter(item => !imported.has(item.id)).map(item => item.name)
  return { annotations: imported, matchedImages: matchedFiles, unmatchedImages, annotationCount, errors }
}

export function parseClassNames(text) {
  return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
}
