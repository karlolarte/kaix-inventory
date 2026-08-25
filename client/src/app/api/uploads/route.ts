import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { BadRequestError } from '@/server/lib/httpError'
import { withAuth } from '@/server/lib/withAuth'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
// Matches Cloudinary's free-plan per-image cap — raising this further
// wouldn't help, uploads would just fail on Cloudinary's side instead.
const MAX_FILE_SIZE = 10 * 1024 * 1024

function uploadBufferToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'kaix-inventory' }, (error, result) => {
      if (error || !result) {
        reject(error instanceof Error ? error : new Error('Cloudinary upload failed.'))
        return
      }
      resolve(result.secure_url)
    })
    stream.end(buffer)
  })
}

// No multer here — Next.js Route Handlers read multipart bodies via the Web
// FormData API directly, so mimetype/size validation (multer's fileFilter +
// limits before) happens by hand instead.
export const POST = withAuth(async (request) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new BadRequestError('No image file was uploaded.')
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new BadRequestError('Only JPEG, PNG, WEBP, or GIF images are allowed.')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError('Image must be 10MB or smaller.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadBufferToCloudinary(buffer)
    return NextResponse.json({ url }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
