
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { unlink } from 'node:fs/promises'
import { fileTypeFromFile } from 'file-type'

const uploadDirectory = path.resolve(process.cwd(), 'uploads')

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
]

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory)
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()

    const safeName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`

    callback(null, safeName)
  }
})

const multerUpload = multer({
  storage,
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPEG, PNG and WebP images are allowed.')
      )
    }

    callback(null, true)
  },
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1
  }
}).single('image')

// Validate the actual file contents after upload.
export const uploadImage = (req, res, next) => {
  multerUpload(req, res, async (error) => {
    if (error) {
      return next(error)
    }

    if (!req.file) {
      return next()
    }

    try {
      const detectedType = await fileTypeFromFile(req.file.path)

      if (
        !detectedType ||
        !allowedMimeTypes.includes(detectedType.mime) ||
        detectedType.mime !== req.file.mimetype
      ) {
        await unlink(req.file.path)
        req.file = undefined

        return next(
          new Error('Invalid image file. Upload a genuine JPEG, PNG or WebP image.')
        )
      }

      next()
    } catch (validationError) {
      try {
        await unlink(req.file.path)
      } catch {
        // Ignore cleanup errors.
      }

      req.file = undefined
      next(validationError)
    }
  })
}
