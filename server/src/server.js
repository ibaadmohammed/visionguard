
import dotenv from 'dotenv'
dotenv.config()

import app from './app.js'
import {
  checkDatabaseConnection,
  closeDatabaseConnection
} from './config/db.js'

const PORT = process.env.PORT || 5000

let server

const startServer = async () => {
  try {
    // Start the HTTP server
    server = app.listen(PORT, () => {
      console.log(`VisionGuard API running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`Health: http://localhost:${PORT}/api/health`)
    })

    // Check database connectivity
    try {
      await checkDatabaseConnection()
      console.log('PostgreSQL connection successful')
    } catch (error) {
      console.error('PostgreSQL connection failed:', error.message)
      console.log('The API is running, but database features are unavailable.')
    }
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`)

  if (server) {
    server.close(async () => {
      try {
        await closeDatabaseConnection()
        console.log('Server and database connections closed.')
        process.exit(0)
      } catch (error) {
        console.error('Shutdown error:', error.message)
        process.exit(1)
      }
    })
  } else {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

startServer()
