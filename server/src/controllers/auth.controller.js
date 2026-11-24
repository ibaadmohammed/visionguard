

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign(
    {
      id: user.id.toString(),
      full_name: user.full_name,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  )
}

// REGISTER USER
export const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email and password are required.'
      })
    }

    const cleanName = fullName.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (cleanName.length < 2 || cleanName.length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Full name must contain between 2 and 120 characters.'
      })
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      })
    }

    if (password.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 72 characters.'
      })
    }

    const existingUser = await prisma.users.findUnique({
      where: { email: cleanEmail },
      select: { id: true }
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.users.create({
      data: {
        full_name: cleanName,
        email: cleanEmail,
        password_hash: passwordHash
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        created_at: true
      }
    })

    const safeUser = {
      ...user,
      id: user.id.toString()
    }

    const token = generateToken(safeUser)

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: safeUser
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      })
    }

    next(error)
  }
}

// LOGIN USER
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      })
    }

    const cleanEmail = email.trim().toLowerCase()

    const user = await prisma.users.findUnique({
      where: { email: cleanEmail }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      })
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.'
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      })
    }

    const safeUser = {
      id: user.id.toString(),
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }

    const token = generateToken(safeUser)

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    })
  } catch (error) {
    next(error)
  }
}
