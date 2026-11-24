import prisma from '../config/prisma.js'

// FORMAT BIGINT VALUES FOR JSON RESPONSES
const formatBigInt = (value) =>
  value === null || value === undefined ? '0' : value.toString()

// FORMAT DECIMAL VALUES
const formatDecimal = (value, precision = 2) =>
  value === null || value === undefined
    ? null
    : value.toFixed(precision)

// GET DASHBOARD STATISTICS
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.id)

    const [
      totalProjects,
      datasetStats,
      fileStats,
      detectionStats,
      recentSessions,
      recentFiles,
      detectionTypes,
      topClasses
    ] = await Promise.all([
      // TOTAL PROJECTS
      prisma.projects.count({
        where: { user_id: userId }
      }),

      // DATASET STATISTICS
      prisma.datasets.aggregate({
        where: {
          projects: {
            user_id: userId
          }
        },
        _count: {
          id: true
        },
        _sum: {
          image_count: true
        }
      }),

      // UPLOADED FILE STATISTICS
      prisma.uploaded_files.aggregate({
        where: {
          user_id: userId
        },
        _count: {
          id: true
        },
        _sum: {
          size_bytes: true
        }
      }),

      // DETECTION STATISTICS
      prisma.detection_sessions.aggregate({
        where: {
          user_id: userId
        },
        _count: {
          id: true
        },
        _sum: {
          total_detections: true
        },
        _avg: {
          inference_time_ms: true,
          average_fps: true
        }
      }),

      // RECENT DETECTION SESSIONS
      prisma.detection_sessions.findMany({
        where: {
          user_id: userId
        },
        select: {
          id: true,
          model_name: true,
          detection_type: true,
          total_detections: true,
          inference_time_ms: true,
          average_fps: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 5
      }),

      // RECENT UPLOADED FILES
      prisma.uploaded_files.findMany({
        where: {
          user_id: userId
        },
        select: {
          id: true,
          original_name: true,
          mime_type: true,
          size_bytes: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 5
      }),

      // DETECTION TYPE BREAKDOWN
      prisma.detection_sessions.groupBy({
        by: ['detection_type'],
        where: {
          user_id: userId
        },
        _count: {
          _all: true
        },
        _sum: {
          total_detections: true
        }
      }),

      // TOP DETECTED CLASSES
      prisma.detection_results.groupBy({
        by: ['class_name'],
        where: {
          detection_sessions: {
            user_id: userId
          }
        },
        _count: {
          _all: true
        },
        _avg: {
          confidence: true
        }
      })
    ])

    // FORMAT RECENT SESSIONS
    const formattedSessions = recentSessions.map((session) => ({
      ...session,
      id: session.id.toString(),
      total_detections: session.total_detections,
      inference_time_ms: session.inference_time_ms?.toString() ?? null,
      average_fps: session.average_fps?.toString() ?? null
    }))

    // FORMAT RECENT FILES
    const formattedFiles = recentFiles.map((file) => ({
      ...file,
      id: file.id.toString(),
      size_bytes: formatBigInt(file.size_bytes)
    }))

    // FORMAT AND SORT DETECTION TYPES
    const formattedDetectionTypes = detectionTypes
      .map((item) => ({
        detection_type: item.detection_type,
        sessions: item._count._all,
        detections: formatBigInt(item._sum.total_detections)
      }))
      .sort((a, b) => b.sessions - a.sessions)

    // FORMAT AND SORT TOP CLASSES
    const formattedTopClasses = topClasses
      .map((item) => ({
        class_name: item.class_name,
        occurrences: item._count._all,
        average_confidence: formatDecimal(
          item._avg.confidence,
          4
        )
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5)

    return res.status(200).json({
      success: true,
      stats: {
        projects: {
          total_projects: totalProjects
        },
        datasets: {
          total_datasets: datasetStats._count.id,
          dataset_images: datasetStats._sum.image_count ?? 0
        },
        files: {
          total_files: fileStats._count.id,
          storage_bytes: formatBigInt(fileStats._sum.size_bytes)
        },
        detections: {
          total_sessions: detectionStats._count.id,
          total_detections: formatBigInt(
            detectionStats._sum.total_detections
          ),
          average_inference_ms: formatDecimal(
            detectionStats._avg.inference_time_ms
          ),
          average_fps: formatDecimal(
            detectionStats._avg.average_fps
          )
        }
      },
      recentSessions: formattedSessions,
      recentFiles: formattedFiles,
      detectionTypes: formattedDetectionTypes,
      topClasses: formattedTopClasses
    })
  } catch (error) {
    next(error)
  }
}