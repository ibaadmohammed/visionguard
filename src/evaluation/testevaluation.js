
import { calculateIoU } from './iou'
import { matchDetections } from './matching'

const boxA = [0, 0, 100, 100]
const boxB = [0, 0, 100, 100]
const boxC = [50, 50, 100, 100]

console.log('Perfect overlap:', calculateIoU(boxA, boxB))
console.log('Partial overlap:', calculateIoU(boxA, boxC))
console.log('No overlap:', calculateIoU(boxA, [200, 200, 50, 50]))

const groundTruth = [
  { class: 'person', bbox: [0, 0, 100, 100] }
]

const predictions = [
  { class: 'person', score: 0.98, bbox: [0, 0, 100, 100] },
  { class: 'person', score: 0.85, bbox: [0, 0, 100, 100] },
  { class: 'car', score: 0.90, bbox: [0, 0, 100, 100] }
]

console.log(
  'Matching results:',
  matchDetections(predictions, groundTruth, 0.5)
)
