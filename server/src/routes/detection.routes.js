
import { Router } from 'express'

import { protect } from '../middleware/auth.middleware.js'

import {
  createDetectionSession,
  getDetectionSessions,
  getDetectionSession,
  deleteDetectionSession
} from '../controllers/detection.controller.js'

const router = Router()

// All detection history routes require authentication
router.use(protect)

// Save a detection session
router.post('/', createDetectionSession)

// Retrieve all detection sessions
router.get('/', getDetectionSessions)

// Retrieve one session and its results
router.get('/:id', getDetectionSession)

// Delete a detection session
router.delete('/:id', deleteDetectionSession)

export default router
