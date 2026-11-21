
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import {
  registerUser,
  loginUser
} from '../controllers/auth.controller.js'

import { protect } from '../middleware/auth.middleware.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
})

// Register
router.post('/register', authLimiter, registerUser)

// Login
router.post('/login', authLimiter, loginUser)

// Get authenticated user
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  })
})

export default router
