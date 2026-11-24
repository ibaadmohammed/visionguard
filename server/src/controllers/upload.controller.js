
import fs from 'node:fs/promises'
import path from 'node:path'
import prisma from '../config/prisma.js'
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  getImageSignedUrl
} from '../services/storage.service.js'

// FORMAT UPLOADED FILE FOR JSON
const formatUploadedFile = (file, signedUrl = null) => ({
  id: file.id.toString(),
  project_id: file.project_id?.toString() ?? null,
  dataset_id: file.dataset_id?.toString() ?? null,
  original_name: file.original_name,
  mime_type: file.mime_type,
  size_bytes: file.size_bytes.toString(),
  created_at: file.created_at,
  signed_url: signedUrl
})

// UPLOAD IMAGE
export const saveUploadedImage = async (req, res, next) => {
  let savedFile = null
  let storagePath = null
  let metadataSaved = false

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload.'
      })
    }

    savedFile = req.file

    const { projectId, datasetId } = req.body

    const validOptionalId = value =>
      value === undefined ||
      value === '' ||
      /^\d+$/.test(String(value))

    if (!validOptionalId(projectId) || !validOptionalId(datasetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project or dataset ID.'
      })
    }

    // VERIFY OWNERSHIP
    const ownership = await prisma.$transaction(async tx => {
      let safeProjectId = null
      let safeDatasetId = null

      if (projectId) {
        const project = await tx.projects.findFirst({
          where: {
            id: BigInt(projectId),
            user_id: BigInt(req.user.id)
          },
          select: { id: true }
        })

        if (!project) return { notFound: 'project' }

        safeProjectId = project.id
      }

      if (datasetId) {
        const dataset = await tx.datasets.findFirst({
          where: {
            id: BigInt(datasetId),
            projects: {
              user_id: BigInt(req.user.id)
            },
            ...(safeProjectId !== null && {
              project_id: safeProjectId
            })
          },
          select: { id: true }
        })

        if (!dataset) return { notFound: 'dataset' }

        safeDatasetId = dataset.id
      }

      return {
        projectId: safeProjectId,
        datasetId: safeDatasetId
      }
    })

    if (ownership.notFound) {
      return res.status(404).json({
        success: false,
        message: ownership.notFound === 'project'
          ? 'Project not found.'
          : 'Dataset not found.'
      })
    }

    // UPLOAD IMAGE TO SUPABASE STORAGE
    storagePath = await uploadImageToStorage({
      localPath: savedFile.path,
      storedName: savedFile.filename,
      userId: req.user.id,
      mimeType: savedFile.mimetype
    })

    // SAVE METADATA IN POSTGRESQL
    const file = await prisma.uploaded_files.create({
      data: {
        user_id: BigInt(req.user.id),
        project_id: ownership.projectId,
        dataset_id: ownership.datasetId,
        original_name: path.basename(savedFile.originalname),
        stored_name: savedFile.filename,
        mime_type: savedFile.mimetype,
        size_bytes: BigInt(savedFile.size),
        storage_path: storagePath
      },
      select: {
        id: true,
        project_id: true,
        dataset_id: true,
        original_name: true,
        mime_type: true,
        size_bytes: true,
        created_at: true
      }
    })

    metadataSaved = true

    const signedUrl = await getImageSignedUrl(storagePath)

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      file: formatUploadedFile(file, signedUrl)
    })
  } catch (error) {
    // ROLL BACK STORAGE UPLOAD IF DATABASE INSERT FAILED
    if (storagePath && !metadataSaved) {
      await deleteImageFromStorage(storagePath).catch(cleanupError => {
        console.error('Supabase Storage cleanup failed:', cleanupError)
      })
    }

    next(error)
  } finally {
    // REMOVE TEMPORARY LOCAL FILE
    if (savedFile?.path) {
      await fs.unlink(savedFile.path).catch(error => {
        if (error.code !== 'ENOENT') {
          console.error('Temporary upload cleanup failed:', error)
        }
      })
    }
  }
}

// GET USER UPLOADS
export const getUploadedFiles = async (req, res, next) => {
  try {
    const files = await prisma.uploaded_files.findMany({
      where: {
        user_id: BigInt(req.user.id)
      },
      select: {
        id: true,
        project_id: true,
        dataset_id: true,
        original_name: true,
        mime_type: true,
        size_bytes: true,
        storage_path: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const formattedFiles = await Promise.all(
      files.map(async file => {
        const signedUrl = await getImageSignedUrl(file.storage_path)

        return formatUploadedFile(file, signedUrl)
      })
    )

    return res.status(200).json({
      success: true,
      count: formattedFiles.length,
      files: formattedFiles
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

    const file = await prisma.uploaded_files.findFirst({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      },
      select: {
        id: true,
        storage_path: true
      }
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Uploaded file not found.'
      })
    }

    const result = await prisma.uploaded_files.deleteMany({
      where: {
        id: file.id,
        user_id: BigInt(req.user.id)
      }
    })

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uploaded file not found.'
      })
    }

    // REMOVE IMAGE FROM SUPABASE STORAGE
    let storageCleanupPending = false

    try {
      await deleteImageFromStorage(file.storage_path)
    } catch (error) {
      storageCleanupPending = true
      console.error('Supabase Storage deletion failed:', error)
    }

    return res.status(200).json({
      success: true,
      message: 'Uploaded file deleted successfully.',
      storage_cleanup_pending: storageCleanupPending
    })
  } catch (error) {
    next(error)
  }
}
