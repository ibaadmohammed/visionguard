
import prisma from '../config/prisma.js'

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

    if (!Number.isInteger(imageCount) || imageCount < 0) {
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

    const project = await prisma.projects.findFirst({
      where: {
        id: BigInt(projectId),
        user_id: BigInt(req.user.id)
      },
      select: { id: true }
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    const dataset = await prisma.datasets.create({
      data: {
        project_id: project.id,
        name: name.trim(),
        description: description?.trim() || null,
        image_count: imageCount,
        annotation_format: annotationFormat
      }
    })

    res.status(201).json({
      success: true,
      message: 'Dataset created successfully.',
      dataset: {
        ...dataset,
        id: dataset.id.toString(),
        project_id: dataset.project_id.toString()
      }
    })
  } catch (error) {
    next(error)
  }
}

// GET ALL DATASETS BELONGING TO USER
export const getDatasets = async (req, res, next) => {
  try {
    const datasets = await prisma.datasets.findMany({
      where: {
        projects: {
          user_id: BigInt(req.user.id)
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const formattedDatasets = datasets.map(dataset => ({
      ...dataset,
      id: dataset.id.toString(),
      project_id: dataset.project_id.toString()
    }))

    res.status(200).json({
      success: true,
      count: formattedDatasets.length,
      datasets: formattedDatasets
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

    const datasets = await prisma.datasets.findMany({
      where: {
        project_id: BigInt(projectId),
        projects: {
          user_id: BigInt(req.user.id)
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const formattedDatasets = datasets.map(dataset => ({
      ...dataset,
      id: dataset.id.toString(),
      project_id: dataset.project_id.toString()
    }))

    res.status(200).json({
      success: true,
      count: formattedDatasets.length,
      datasets: formattedDatasets
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

    const existingDataset = await prisma.datasets.findFirst({
      where: {
        id: BigInt(id),
        projects: {
          user_id: BigInt(req.user.id)
        }
      },
      select: { id: true }
    })

    if (!existingDataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found.'
      })
    }

    const dataset = await prisma.datasets.update({
      where: {
        id: existingDataset.id
      },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null
        }),
        ...(imageCount !== undefined && { image_count: imageCount }),
        ...(annotationFormat !== undefined && {
          annotation_format: annotationFormat
        })
      }
    })

    res.status(200).json({
      success: true,
      message: 'Dataset updated successfully.',
      dataset: {
        ...dataset,
        id: dataset.id.toString(),
        project_id: dataset.project_id.toString()
      }
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

    const result = await prisma.datasets.deleteMany({
      where: {
        id: BigInt(id),
        projects: {
          user_id: BigInt(req.user.id)
        }
      }
    })

    if (result.count === 0) {
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
