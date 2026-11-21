
import { Router } from 'express'

import { protect } from '../middleware/auth.middleware.js'
import { uploadImage } from '../middleware/upload.middleware.js'

import {
  saveUploadedImage,
  getUploadedFiles,
  deleteUploadedFile
} from '../controllers/upload.controller.js'

const router = Router()

router.use(protect)

router.post('/', uploadImage, saveUploadedImage)
router.get('/', getUploadedFiles)
router.delete('/:id', deleteUploadedFile)

export default router
