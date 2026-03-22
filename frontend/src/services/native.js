/**
 * BriBox Native Bridge
 * Provides native camera, gallery, and filesystem access via Capacitor
 * Falls back to web APIs when running in a browser
 */

import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'

// Check if running on a native platform
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'web' | 'ios' | 'android'

/**
 * Open the native camera to take a photo
 * @returns {Promise<{dataUrl: string, format: string}>}
 */
export async function takePhoto() {
  if (!isNative) {
    // Fallback: use file input for web
    return openWebFilePicker('image/*', 'environment')
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    correctOrientation: true,
    width: 1920,
    height: 1080,
  })

  return {
    dataUrl: photo.dataUrl,
    format: photo.format,
  }
}

/**
 * Open the native photo gallery to pick an image
 * @returns {Promise<{dataUrl: string, format: string}>}
 */
export async function pickFromGallery() {
  if (!isNative) {
    return openWebFilePicker('image/*')
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos,
    correctOrientation: true,
  })

  return {
    dataUrl: photo.dataUrl,
    format: photo.format,
  }
}

/**
 * Open camera or gallery with a prompt (native action sheet)
 * @returns {Promise<{dataUrl: string, format: string}>}
 */
export async function pickImage() {
  if (!isNative) {
    return openWebFilePicker('image/*')
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,  // Shows "Camera" or "Photo Library" action sheet
    correctOrientation: true,
    promptLabelHeader: 'Upload Property Photo',
    promptLabelPhoto: 'Choose from Gallery',
    promptLabelPicture: 'Take a Photo',
  })

  return {
    dataUrl: photo.dataUrl,
    format: photo.format,
  }
}

/**
 * Save a file to the device filesystem
 * @param {string} fileName
 * @param {string} data - base64 encoded data
 * @returns {Promise<{uri: string}>}
 */
export async function saveFile(fileName, data) {
  if (!isNative) {
    // Web fallback: trigger download
    const link = document.createElement('a')
    link.href = `data:application/octet-stream;base64,${data}`
    link.download = fileName
    link.click()
    return { uri: fileName }
  }

  const result = await Filesystem.writeFile({
    path: `BriBox/${fileName}`,
    data,
    directory: Directory.Documents,
    recursive: true,
  })

  return { uri: result.uri }
}

/**
 * Read a file from the device filesystem
 * @param {string} path
 * @returns {Promise<{data: string}>}
 */
export async function readFile(path) {
  if (!isNative) {
    throw new Error('File reading not supported in web mode')
  }

  const result = await Filesystem.readFile({
    path: `BriBox/${path}`,
    directory: Directory.Documents,
  })

  return { data: result.data }
}

// ---- Internal Helpers ----

function openWebFilePicker(accept, capture) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    if (capture) input.capture = capture

    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return reject(new Error('No file selected'))

      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          dataUrl: reader.result,
          format: file.type.split('/')[1] || 'jpeg',
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    }

    input.click()
  })
}
