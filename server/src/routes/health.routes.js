
import { Router } from 'express'
import {
  checkDatabaseConnection
} from '../config/db.js'

const router = Router()

// Check whether the backend server is running
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VisionGuard API is running',
    timestamp: new Date().toISOString()
  })
})

// Check whether PostgreSQL is connected
router.get('/db', async (req, res, next) => {
  try {
    const database = await checkDatabaseConnection()

    res.status(200).json({
      success: true,
      message: 'PostgreSQL connection successful',
      database
    })
  } catch (error) {
    next(error)
  }
})

export default router
