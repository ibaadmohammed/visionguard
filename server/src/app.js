
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.routes.js'
import detectionRoutes from './routes/detection.routes.js'
import projectRoutes from './routes/project.routes.js'
import datasetRoutes from './routes/dataset.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import healthRoutes from './routes/health.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import {
  notFoundHandler,
  errorHandler
} from './middleware/errorHandler.js'

const app = express()

// Security headers
app.use(helmet())

// CORS configuration
const allowedOrigins = (
  process.env.CLIENT_URL || 'http://localhost:5173'
)
  .split(',')
  .map(origin => origin.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
  })
)

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Parse JSON requests
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
})

app.use('/api', apiLimiter)

// API routes
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/detections', detectionRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/datasets', datasetRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/dashboard', dashboardRoutes)
// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to VisionGuard API',
    version: '1.0.0'
  })
})

// Handle unknown routes
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export default app
