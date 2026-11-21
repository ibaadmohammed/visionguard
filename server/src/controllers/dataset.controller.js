
import pool from '../config/db.js'

// CREATE DATASET
export const createDataset = async (req, res, next) => {
  try {
    const {
      projectId,
      name,
      description,
      imageCount = 0,
      annotationFormat = null
    } = req.body

    if (!/^\d+$/.test(String(projectId ?? ''))) {
      return res.status(400).json({
        success: false,
        message: 'A valid project ID is required.'
      })
    }

    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dataset name must contain between 2 and 150 characters.'
      })
    }

    if (
      !Number.isInteger(imageCount) ||
      imageCount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Image count must be a non-negative integer.'
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

    const allowedFormats = ['COCO', 'YOLO', 'VOC', 'CUSTOM']

    if (
      annotationFormat !== null &&
      !allowedFormats.includes(annotationFormat)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid annotation format.'
      })
    }

    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    )

    if (project.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    const result = await pool.query(
      `INSERT INTO datasets
       (project_id, name, description, image_count, annotation_format)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        projectId,
        name.trim(),
        description?.trim() || null,
        imageCount,
        annotationFormat
      ]
    )

    res.status(201).json({
      success: true,
      message: 'Dataset created successfully.',
      dataset: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// GET ALL DATASETS BELONGING TO USER
export const getDatasets = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.*
       FROM datasets d
       INNER JOIN projects p ON p.id = d.project_id
       WHERE p.user_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    )

    res.status(200).json({
      success: true,
      count: result.rows.length,
      datasets: result.rows
    })
  } catch (error) {
    next(error)
  }
}

// GET DATASETS FOR ONE PROJECT
export const getProjectDatasets = async (req, res, next) => {
  try {
    const { projectId } = req.params

    if (!/^\d+$/.test(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      })
    }

    const result = await pool.query(
      `SELECT d.*
       FROM datasets d
       INNER JOIN projects p ON p.id = d.project_id
       WHERE d.project_id = $1 AND p.user_id = $2
       ORDER BY d.created_at DESC`,
      [projectId, req.user.id]
    )

    res.status(200).json({
      success: true,
      count: result.rows.length,
      datasets: result.rows
    })
  } catch (error) {
    next(error)
  }
}

// UPDATE DATASET
export const updateDataset = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, imageCount, annotationFormat } = req.body

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dataset ID.'
      })
    }

    if (
      name === undefined &&
      description === undefined &&
      imageCount === undefined &&
      annotationFormat === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update.'
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
        message: 'Dataset name must contain between 2 and 150 characters.'
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

    if (
      imageCount !== undefined &&
      (!Number.isInteger(imageCount) || imageCount < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Image count must be a non-negative integer.'
      })
    }

    const allowedFormats = ['COCO', 'YOLO', 'VOC', 'CUSTOM']

    if (
      annotationFormat !== undefined &&
      annotationFormat !== null &&
      !allowedFormats.includes(annotationFormat)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid annotation format.'
      })
    }

    const result = await pool.query(
      `UPDATE datasets d
       SET
         name = COALESCE($1, d.name),
         description = CASE
           WHEN $2::BOOLEAN THEN $3
           ELSE d.description
         END,
         image_count = COALESCE($4, d.image_count),
         annotation_format = CASE
           WHEN $5::BOOLEAN THEN $6
           ELSE d.annotation_format
         END
       FROM projects p
       WHERE d.id = $7
         AND d.project_id = p.id
         AND p.user_id = $8
       RETURNING d.*`,
      [
        name === undefined ? null : name.trim(),
        description !== undefined,
        description === undefined ? null : (description?.trim() || null),
        imageCount ?? null,
        annotationFormat !== undefined,
        annotationFormat ?? null,
        id,
        req.user.id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Dataset updated successfully.',
      dataset: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// DELETE DATASET
export const deleteDataset = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dataset ID.'
      })
    }

    const result = await pool.query(
      `DELETE FROM datasets d
       USING projects p
       WHERE d.id = $1
         AND d.project_id = p.id
         AND p.user_id = $2
       RETURNING d.id`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Dataset deleted successfully.'
    })
  } catch (error) {
    next(error)
  }
}
