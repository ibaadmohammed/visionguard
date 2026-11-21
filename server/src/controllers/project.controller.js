
import pool from '../config/db.js'

// CREATE PROJECT
export const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body

    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Project name must contain between 2 and 150 characters.'
      })
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Description must be text.'
      })
    }

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        req.user.id,
        name.trim(),
        description?.trim() || null
      ]
    )

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// GET ALL USER PROJECTS
export const getProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         p.*,
         COUNT(DISTINCT d.id)::INTEGER AS dataset_count,
         COUNT(DISTINCT s.id)::INTEGER AS detection_session_count
       FROM projects p
       LEFT JOIN datasets d ON d.project_id = p.id
       LEFT JOIN detection_sessions s ON s.project_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    )

    res.status(200).json({
      success: true,
      count: result.rows.length,
      projects: result.rows
    })
  } catch (error) {
    next(error)
  }
}

// GET ONE PROJECT
export const getProject = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      })
    }

    const result = await pool.query(
      `SELECT
         p.*,
         COUNT(DISTINCT d.id)::INTEGER AS dataset_count,
         COUNT(DISTINCT s.id)::INTEGER AS detection_session_count
       FROM projects p
       LEFT JOIN datasets d ON d.project_id = p.id
       LEFT JOIN detection_sessions s ON s.project_id = p.id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    res.status(200).json({
      success: true,
      project: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// UPDATE PROJECT
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      })
    }

    if (name === undefined && description === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Provide a project name or description to update.'
      })
    }

    if (
      name !== undefined &&
      (
        typeof name !== 'string' ||
        name.trim().length < 2 ||
        name.trim().length > 150
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Project name must contain between 2 and 150 characters.'
      })
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Description must be text.'
      })
    }

    const result = await pool.query(
      `UPDATE projects
       SET
         name = COALESCE($1, name),
         description = CASE
           WHEN $2::BOOLEAN THEN $3
           ELSE description
         END,
         updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        name === undefined ? null : name.trim(),
        description !== undefined,
        description === undefined ? null : (description?.trim() || null),
        id,
        req.user.id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// DELETE PROJECT
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      })
    }

    const result = await pool.query(
      `DELETE FROM projects
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully.'
    })
  } catch (error) {
    next(error)
  }
}
