export function calculatePrecisionRecall(tp, fp, fn) {
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  return { precision: precision * 100, recall: recall * 100, f1: f1 * 100 }
}
