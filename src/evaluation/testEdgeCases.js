
import { evaluateDataset } from './mapEvaluation'

const tests = [
  {
    name: 'False positive before true positive',
    dataset: [{
      id: '1',
      groundTruth: [
        { class: 'person', bbox: [0, 0, 100, 100] }
      ],
      predictions: [
        { class: 'person', score: 0.99, bbox: [200, 200, 50, 50] },
        { class: 'person', score: 0.90, bbox: [0, 0, 100, 100] }
      ]
    }]
  },
  {
    name: 'Missed detection',
    dataset: [{
      id: '1',
      groundTruth: [
        { class: 'person', bbox: [0, 0, 100, 100] },
        { class: 'person', bbox: [200, 200, 100, 100] }
      ],
      predictions: [
        { class: 'person', score: 0.95, bbox: [0, 0, 100, 100] }
      ]
    }]
  },
  {
    name: 'No predictions',
    dataset: [{
      id: '1',
      groundTruth: [
        { class: 'person', bbox: [0, 0, 100, 100] }
      ],
      predictions: []
    }]
  },
  {
    name: 'Empty dataset',
    dataset: []
  }
]

for (const test of tests) {
  console.log(`\n--- ${test.name} ---`)
  console.log(
    JSON.stringify(evaluateDataset(test.dataset), null, 2)
  )
}
