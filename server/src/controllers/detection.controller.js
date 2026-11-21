
import pool from '../config/db.js'

// SAVE A DETECTION SESSION
export const createDetectionSession = async (req, res, next) => {
  const client = await pool.connect()

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

    if (!modelName || !detectionType || !Array.isArray(detections)) {
      return res.status(400).json({
        success: false,
        message: 'Model name, detection type and detections are required.'
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
      value === undefined || value === null ||
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

    await client.query('BEGIN')

    let safeProjectId = null

    if (projectId !== undefined && projectId !== null) {
      const project = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, req.user.id]
      )

      if (project.rows.length === 0) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        })
      }

      safeProjectId = projectId
    }

    const sessionResult = await client.query(
      `INSERT INTO detection_sessions
       (user_id, project_id, model_name, detection_type,
        total_detections, inference_time_ms, average_fps)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        safeProjectId,
        modelName.trim(),
        detectionType,
        count,
        inferenceTimeMs ?? null,
        averageFps ?? null
      ]
    )

    const session = sessionResult.rows[0]

    for (const detection of detections) {
      await client.query(
        `INSERT INTO detection_results
         (session_id, class_name, confidence, x_min, y_min, x_max, y_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.id,
          detection.className.trim(),
          detection.confidence,
          detection.xMin ?? null,
          detection.yMin ?? null,
          detection.xMax ?? null,
          detection.yMax ?? null
        ]
      )
    }

    await client.query('COMMIT')

    return res.status(201).json({
      success: true,
      message: 'Detection session saved successfully.',
      session
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally {
    client.release()
  }
}

// GET ALL USER DETECTION SESSIONS
export const getDetectionSessions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM detection_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      sessions: result.rows
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

    const sessionResult = await pool.query(
      `SELECT *
       FROM detection_sessions
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Detection session not found.'
      })
    }

    const detectionsResult = await pool.query(
      `SELECT *
       FROM detection_results
       WHERE session_id = $1
       ORDER BY id ASC`,
      [id]
    )

    return res.status(200).json({
      success: true,
      session: sessionResult.rows[0],
      detections: detectionsResult.rows
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

    const result = await pool.query(
      `DELETE FROM detection_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
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
