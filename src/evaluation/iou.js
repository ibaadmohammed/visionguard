
/**
 * VisionGuard - IoU utilities
 * Bounding box format: [x, y, width, height]
 */

export function isValidBoundingBox(box) {
  return (
    Array.isArray(box) &&
    box.length === 4 &&
    box.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value)
    ) &&
    box[2] > 0 &&
    box[3] > 0
  )
}

export function calculateIoU(boxA, boxB) {
  if (
    !isValidBoundingBox(boxA) ||
    !isValidBoundingBox(boxB)
  ) {
    return 0
  }

  const [ax, ay, aw, ah] = boxA
  const [bx, by, bw, bh] = boxB

  const x1 = Math.max(ax, bx)
  const y1 = Math.max(ay, by)
  const x2 = Math.min(ax + aw, bx + bw)
  const y2 = Math.min(ay + ah, by + bh)

  const intersectionWidth = Math.max(0, x2 - x1)
  const intersectionHeight = Math.max(0, y2 - y1)

  const intersectionArea =
    intersectionWidth * intersectionHeight

  const areaA = aw * ah
  const areaB = bw * bh

  const unionArea = areaA + areaB - intersectionArea

  return unionArea > 0
    ? intersectionArea / unionArea
    : 0
}
