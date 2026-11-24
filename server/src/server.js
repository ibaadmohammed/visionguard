
import dotenv from 'dotenv'
dotenv.config()

import app from './app.js'
import prisma from './config/prisma.js'

const PORT = process.env.PORT || 5000

let server

const startServer = async () => {
  try {
    // START HTTP SERVER
    server = app.listen(PORT, () => {
      console.log(`VisionGuard API running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`Health: http://localhost:${PORT}/api/health`)
    })

    // CHECK DATABASE CONNECTIVITY
    try {
      await prisma.$queryRaw`SELECT 1`
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

// GRACEFUL SHUTDOWN
const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`)

  if (server) {
    server.close(async () => {
      try {
        await prisma.$disconnect()
        console.log('Server and Prisma connections closed.')
        process.exit(0)
      } catch (error) {
        console.error('Shutdown error:', error.message)
        process.exit(1)
      }
    })
  } else {
    await prisma.$disconnect()
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

startServer()
