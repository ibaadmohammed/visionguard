
import { Router } from 'express'

import { protect } from '../middleware/auth.middleware.js'

import {
  createDataset,
  getDatasets,
  getProjectDatasets,
  updateDataset,
  deleteDataset
} from '../controllers/dataset.controller.js'

const router = Router()

router.use(protect)

router.post('/', createDataset)
router.get('/', getDatasets)
router.get('/project/:projectId', getProjectDatasets)
router.put('/:id', updateDataset)
router.delete('/:id', deleteDataset)

export default router
