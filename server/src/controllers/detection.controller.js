import prisma from '../config/prisma.js'

// FORMAT BIGINT IDS FOR JSON RESPONSES
const formatSession = (session) => ({
  ...session,
  id: session.id.toString(),
  user_id: session.user_id.toString(),
  project_id: session.project_id?.toString() ?? null
})

const formatDetection = (detection) => ({
  ...detection,
  id: detection.id.toString(),
  session_id: detection.session_id.toString()
})

// SAVE A DETECTION SESSION
export const createDetectionSession = async (req, res, next) => {
  try {
    const {
      modelName,
      detectionType,
      totalDetections,
      inferenceTimeMs,
      averageFps,
      projectId,
      detections
    } = req.body

    const allowedTypes = ['image', 'webcam', 'video', 'dataset']

    if (
      typeof modelName !== 'string' ||
      !modelName.trim() ||
      !detectionType ||
      !Array.isArray(detections)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Model name, detection type and detections are required.'
      })
    }

    if (modelName.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Model name must not exceed 150 characters.'
      })
    }

    if (!allowedTypes.includes(detectionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid detection type.'
      })
    }

    if (detections.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Too many detection results in one session.'
      })
    }

    const validNumber = (value) =>
      value === undefined ||
      value === null ||
      (typeof value === 'number' && Number.isFinite(value))

    if (
      !detections.every((item) =>
        item &&
        typeof item.className === 'string' &&
        item.className.trim().length > 0 &&
        item.className.length <= 120 &&
        typeof item.confidence === 'number' &&
        Number.isFinite(item.confidence) &&
        item.confidence >= 0 &&
        item.confidence <= 1 &&
        validNumber(item.xMin) &&
        validNumber(item.yMin) &&
        validNumber(item.xMax) &&
        validNumber(item.yMax)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'One or more detection results are invalid.'
      })
    }

    const count = totalDetections ?? detections.length

    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count !== detections.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Total detections must match the supplied results.'
      })
    }

    if (
      !validNumber(inferenceTimeMs) ||
      !validNumber(averageFps) ||
      (inferenceTimeMs != null && inferenceTimeMs < 0) ||
      (averageFps != null && averageFps < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inference time or FPS value.'
      })
    }

    if (
      projectId !== undefined &&
      projectId !== null &&
      !/^\d+$/.test(String(projectId))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      })
    }

    // CREATE SESSION AND RESULTS IN ONE TRANSACTION
    const session = await prisma.$transaction(async (tx) => {
      let safeProjectId = null

      if (projectId !== undefined && projectId !== null) {
        const project = await tx.projects.findFirst({
          where: {
            id: BigInt(projectId),
            user_id: BigInt(req.user.id)
          },
          select: { id: true }
        })

        if (!project) {
          return null
        }

        safeProjectId = project.id
      }

      return tx.detection_sessions.create({
        data: {
          user_id: BigInt(req.user.id),
          project_id: safeProjectId,
          model_name: modelName.trim(),
          detection_type: detectionType,
          total_detections: count,
          inference_time_ms: inferenceTimeMs ?? null,
          average_fps: averageFps ?? null,
          detection_results: {
            create: detections.map((detection) => ({
              class_name: detection.className.trim(),
              confidence: detection.confidence,
              x_min: detection.xMin ?? null,
              y_min: detection.yMin ?? null,
              x_max: detection.xMax ?? null,
              y_max: detection.yMax ?? null
            }))
          }
        }
      })
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Detection session saved successfully.',
      session: formatSession(session)
    })
  } catch (error) {
    next(error)
  }
}

// GET ALL USER DETECTION SESSIONS
export const getDetectionSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.detection_sessions.findMany({
      where: {
        user_id: BigInt(req.user.id)
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions: sessions.map(formatSession)
    })
  } catch (error) {
    next(error)
  }
}

// GET ONE SESSION WITH ITS DETECTION RESULTS
export const getDetectionSession = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID.'
      })
    }

    const session = await prisma.detection_sessions.findFirst({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      },
      include: {
        detection_results: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Detection session not found.'
      })
    }

    const { detection_results, ...sessionData } = session

    return res.status(200).json({
      success: true,
      session: formatSession(sessionData),
      detections: detection_results.map(formatDetection)
    })
  } catch (error) {
    next(error)
  }
}

// DELETE ONE SESSION
export const deleteDetectionSession = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID.'
      })
    }

    const result = await prisma.detection_sessions.deleteMany({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      }
    })

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Detection session not found.'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Detection session deleted successfully.'
    })
  } catch (error) {
    next(error)
  }
}