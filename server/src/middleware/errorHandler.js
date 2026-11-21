export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  res.status(404)
  next(error)
}

export const errorHandler = (err, req, res, next) => {
  let statusCode =
    res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : 500

  let message = err.message || 'Internal Server Error'

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum allowed size is 15 MB.'
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Only one image can be uploaded at a time.'
    } else {
      message = 'Invalid file upload.'
    }
  }

  // Handle unsupported image types
  if (
  err.message === 'Only JPEG, PNG and WebP images are allowed.' ||
  err.message.startsWith('Invalid image file.')
) {
  statusCode = 400
}
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  })
}