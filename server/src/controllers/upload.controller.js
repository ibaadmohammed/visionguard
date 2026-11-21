
import fs from 'node:fs/promises'
import path from 'node:path'
import pool from '../config/db.js'

const uploadDirectory = path.resolve(process.cwd(), 'uploads')

// UPLOAD IMAGE
export const saveUploadedImage = async (req, res, next) => {
  let savedFile = null

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload.'
      })
    }

    savedFile = req.file

    const { projectId, datasetId } = req.body

    const validOptionalId = (value) =>
      value === undefined ||
      value === '' ||
      /^\d+$/.test(String(value))

    if (!validOptionalId(projectId) || !validOptionalId(datasetId)) {
      await fs.unlink(savedFile.path)

      return res.status(400).json({
        success: false,
        message: 'Invalid project or dataset ID.'
      })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      if (projectId) {
        const project = await client.query(
          'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
          [projectId, req.user.id]
        )

        if (project.rows.length === 0) {
          await client.query('ROLLBACK')
          await fs.unlink(savedFile.path)

          return res.status(404).json({
            success: false,
            message: 'Project not found.'
          })
        }
      }

      if (datasetId) {
        const dataset = await client.query(
          `SELECT d.id
           FROM datasets d
           INNER JOIN projects p ON p.id = d.project_id
           WHERE d.id = $1 AND p.user_id = $2`,
          [datasetId, req.user.id]
        )

        if (dataset.rows.length === 0) {
          await client.query('ROLLBACK')
          await fs.unlink(savedFile.path)

          return res.status(404).json({
            success: false,
            message: 'Dataset not found.'
          })
        }
      }

      const result = await client.query(
        `INSERT INTO uploaded_files
         (user_id, project_id, dataset_id, original_name,
          stored_name, mime_type, size_bytes, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, project_id, dataset_id, original_name,
                   mime_type, size_bytes, created_at`,
        [
          req.user.id,
          projectId || null,
          datasetId || null,
          path.basename(savedFile.originalname),
          savedFile.filename,
          savedFile.mimetype,
          savedFile.size,
          savedFile.path
        ]
      )

      await client.query('COMMIT')

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        file: result.rows[0]
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if (savedFile) {
      await fs.unlink(savedFile.path).catch(() => {})
    }

    next(error)
  }
}

// GET USER UPLOADS
export const getUploadedFiles = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, project_id, dataset_id, original_name,
              mime_type, size_bytes, created_at
       FROM uploaded_files
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    res.status(200).json({
      success: true,
      count: result.rows.length,
      files: result.rows
    })
  } catch (error) {
    next(error)
  }
}

// DELETE UPLOADED FILE
export const deleteUploadedFile = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID.'
      })
    }

    const result = await pool.query(
      `DELETE FROM uploaded_files
       WHERE id = $1 AND user_id = $2
       RETURNING id, stored_name`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uploaded file not found.'
      })
    }

    const filePath = path.join(
      uploadDirectory,
      result.rows[0].stored_name
    )

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })

    res.status(200).json({
      success: true,
      message: 'Uploaded file deleted successfully.'
    })
  } catch (error) {
    next(error)
  }
}
