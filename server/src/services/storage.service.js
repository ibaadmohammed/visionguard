import fs from 'node:fs/promises'
import path from 'node:path'
import supabase from '../config/supabase.js'

const bucket = process.env.SUPABASE_STORAGE_BUCKET

if (!bucket) {
  throw new Error('SUPABASE_STORAGE_BUCKET is missing.')
}

// UPLOAD IMAGE TO SUPABASE STORAGE
export const uploadImageToStorage = async ({
  localPath,
  storedName,
  userId,
  mimeType
}) => {
  const fileBuffer = await fs.readFile(localPath)

  const storagePath = `${userId}/${path.basename(storedName)}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    })

  if (error) throw error

  return data.path
}

// DELETE IMAGE FROM SUPABASE STORAGE
export const deleteImageFromStorage = async (storagePath) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath])

  if (error) throw error
}

// GENERATE TEMPORARY SIGNED URL
export const getImageSignedUrl = async (
  storagePath,
  expiresIn = 3600
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error

  return data.signedUrl
}
