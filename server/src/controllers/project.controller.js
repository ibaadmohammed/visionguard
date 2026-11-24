
import prisma from '../config/prisma.js'

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

    const project = await prisma.projects.create({
      data: {
        user_id: BigInt(req.user.id),
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project: {
        ...project,
        id: project.id.toString(),
        user_id: project.user_id.toString()
      }
    })
  } catch (error) {
    next(error)
  }
}

// GET ALL USER PROJECTS
export const getProjects = async (req, res, next) => {
  try {
    const projects = await prisma.projects.findMany({
      where: {
        user_id: BigInt(req.user.id)
      },
      include: {
        _count: {
          select: {
            datasets: true,
            detection_sessions: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const formattedProjects = projects.map(project => ({
      ...project,
      id: project.id.toString(),
      user_id: project.user_id.toString(),
      dataset_count: project._count.datasets,
      detection_session_count: project._count.detection_sessions,
      _count: undefined
    }))

    res.status(200).json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects
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

    const project = await prisma.projects.findFirst({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      },
      include: {
        _count: {
          select: {
            datasets: true,
            detection_sessions: true
          }
        }
      }
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    const formattedProject = {
      ...project,
      id: project.id.toString(),
      user_id: project.user_id.toString(),
      dataset_count: project._count.datasets,
      detection_session_count: project._count.detection_sessions,
      _count: undefined
    }

    res.status(200).json({
      success: true,
      project: formattedProject
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

    const existingProject = await prisma.projects.findFirst({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      },
      select: { id: true }
    })

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      })
    }

    const project = await prisma.projects.update({
      where: {
        id: existingProject.id
      },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null
        }),
        updated_at: new Date()
      }
    })

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project: {
        ...project,
        id: project.id.toString(),
        user_id: project.user_id.toString()
      }
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

    const result = await prisma.projects.deleteMany({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      }
    })

    if (result.count === 0) {
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
