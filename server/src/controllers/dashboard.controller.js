
import pool from '../config/db.js'

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id

    const [
      projectStats,
      datasetStats,
      fileStats,
      detectionStats,
      recentSessions,
      recentFiles,
      detectionTypes,
      topClasses
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::INTEGER AS total_projects
         FROM projects
         WHERE user_id = $1`,
        [userId]
      ),

      pool.query(
        `SELECT
           COUNT(d.id)::INTEGER AS total_datasets,
           COALESCE(SUM(d.image_count), 0)::BIGINT AS dataset_images
         FROM datasets d
         INNER JOIN projects p ON p.id = d.project_id
         WHERE p.user_id = $1`,
        [userId]
      ),

      pool.query(
        `SELECT
           COUNT(*)::INTEGER AS total_files,
           COALESCE(SUM(size_bytes), 0)::BIGINT AS storage_bytes
         FROM uploaded_files
         WHERE user_id = $1`,
        [userId]
      ),

      pool.query(
        `SELECT
           COUNT(*)::INTEGER AS total_sessions,
           COALESCE(SUM(total_detections), 0)::BIGINT AS total_detections,
           ROUND(AVG(inference_time_ms), 2) AS average_inference_ms,
           ROUND(AVG(average_fps), 2) AS average_fps
         FROM detection_sessions
         WHERE user_id = $1`,
        [userId]
      ),

      pool.query(
        `SELECT id, model_name, detection_type,
                total_detections, inference_time_ms,
                average_fps, created_at
         FROM detection_sessions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      ),

      pool.query(
        `SELECT id, original_name, mime_type,
                size_bytes, created_at
         FROM uploaded_files
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      ),

      pool.query(
        `SELECT detection_type,
                COUNT(*)::INTEGER AS sessions,
                COALESCE(SUM(total_detections), 0)::BIGINT AS detections
         FROM detection_sessions
         WHERE user_id = $1
         GROUP BY detection_type
         ORDER BY sessions DESC`,
        [userId]
      ),

      pool.query(
        `SELECT dr.class_name,
                COUNT(*)::INTEGER AS occurrences,
                ROUND(AVG(dr.confidence), 4) AS average_confidence
         FROM detection_results dr
         INNER JOIN detection_sessions ds
           ON ds.id = dr.session_id
         WHERE ds.user_id = $1
         GROUP BY dr.class_name
         ORDER BY occurrences DESC
         LIMIT 5`,
        [userId]
      )
    ])

    return res.status(200).json({
      success: true,
      stats: {
        projects: projectStats.rows[0],
        datasets: datasetStats.rows[0],
        files: fileStats.rows[0],
        detections: detectionStats.rows[0]
      },
      recentSessions: recentSessions.rows,
      recentFiles: recentFiles.rows,
      detectionTypes: detectionTypes.rows,
      topClasses: topClasses.rows
    })
  } catch (error) {
    next(error)
  }
}
