
import { evaluateDataset } from './mapEvaluation'

const dataset = [
  {
    id: 'image-1',
    groundTruth: [
      { class: 'person', bbox: [0, 0, 100, 100] },
      { class: 'car', bbox: [200, 200, 100, 100] }
    ],
    predictions: [
      { class: 'person', score: 0.98, bbox: [0, 0, 100, 100] },
      { class: 'car', score: 0.95, bbox: [200, 200, 100, 100] },
      { class: 'person', score: 0.60, bbox: [0, 0, 100, 100] }
    ]
  },
  {
    id: 'image-2',
    groundTruth: [
      { class: 'person', bbox: [50, 50, 100, 100] }
    ],
    predictions: [
      { class: 'person', score: 0.92, bbox: [50, 50, 100, 100] }
    ]
  }
]

console.log(
  JSON.stringify(evaluateDataset(dataset), null, 2)
)
