
import { Router } from 'express'
import prisma from '../config/prisma.js'

const router = Router()

// CHECK BACKEND STATUS
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VisionGuard API is running',
    timestamp: new Date().toISOString()
  })
})

// CHECK POSTGRESQL CONNECTION
router.get('/db', async (req, res, next) => {
  try {
    const database = await prisma.$queryRaw`
      SELECT NOW() AS current_time
    `

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
