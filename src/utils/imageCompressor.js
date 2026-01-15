/* eslint-disable no-undef */
/**
 * 图片压缩工具
 * 用于在上传前压缩大尺寸图片，减少内存占用和网络传输
 */

class ImageCompressor {
  constructor() {
    this.defaultOptions = {
      maxWidth: 3840, // 4K宽度
      maxHeight: 2160, // 4K高度
      quality: 0.9, // 压缩质量 0-1
      mimeType: 'image/jpeg', // 输出格式
      maxSizeMB: 5, // 最大文件大小（MB）
      enableResize: true, // 是否启用尺寸压缩
      enableQualityCompress: true // 是否启用质量压缩
    }
  }

  /**
   * 压缩单个图片
   * @param {File} file - 原始图片文件
   * @param {Object} options - 压缩选项
   * @returns {Promise<{file: File, compressed: boolean, originalSize: number, compressedSize: number, ratio: number}>}
   */
  async compress(file, options = {}) {
    const opts = { ...this.defaultOptions, ...options }

    // 检查是否需要压缩
    const needCompress = this._needCompress(file, opts)
    if (!needCompress) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        compressedSize: file.size,
        ratio: 1
      }
    }

    try {
      // 加载图片
      const img = await this._loadImage(file)

      // 计算目标尺寸
      const { width, height } = this._calculateSize(img.width, img.height, opts)

      // 创建 Canvas 进行压缩
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为 Blob
      let blob = await this._canvasToBlob(canvas, opts.mimeType, opts.quality)

      // 如果压缩后反而更大，使用原图
      if (blob.size > file.size) {
        return {
          file,
          compressed: false,
          originalSize: file.size,
          compressedSize: file.size,
          ratio: 1
        }
      }

      // 如果启用了质量压缩且文件仍然过大，尝试降低质量
      if (opts.enableQualityCompress && blob.size > opts.maxSizeMB * 1024 * 1024) {
        blob = await this._compressToTargetSize(
          canvas,
          opts.mimeType,
          blob.size,
          opts.maxSizeMB * 1024 * 1024
        )
      }

      // 创建新文件
      const compressedFile = new File([blob], file.name, {
        type: blob.type,
        lastModified: Date.now()
      })

      return {
        file: compressedFile,
        compressed: true,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        ratio: file.size / compressedFile.size
      }
    } catch {
      // 压缩失败，返回原图
      return {
        file,
        compressed: false,
        originalSize: file.size,
        compressedSize: file.size,
        ratio: 1
      }
    }
  }

  /**
   * 批量压缩图片
   * @param {File[]} files - 图片文件数组
   * @param {Object} options - 压缩选项
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Array>}
   */
  async compressMultiple(files, options = {}, onProgress = null) {
    const results = []
    const total = files.length

    for (let i = 0; i < files.length; i++) {
      const result = await this.compress(files[i], options)
      results.push(result)

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          currentFile: files[i].name,
          result
        })
      }
    }

    return results
  }

  /**
   * 检查是否需要压缩
   */
  _needCompress(file, options) {
    // 文件大小超过限制
    if (file.size > options.maxSizeMB * 1024 * 1024) {
      return true
    }

    // 非图片文件不压缩
    if (!file.type.startsWith('image/')) {
      return false
    }

    // WebP 格式且文件小于限制，不压缩
    if (file.type === 'image/webp' && file.size <= options.maxSizeMB * 1024 * 1024) {
      return false
    }

    return false
  }

  /**
   * 加载图片
   */
  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('图片加载失败'))
      }

      img.src = url
    })
  }

  /**
   * 计算目标尺寸
   */
  _calculateSize(width, height, options) {
    if (!options.enableResize) {
      return { width, height }
    }

    const { maxWidth, maxHeight } = options

    // 不需要缩放
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height }
    }

    // 计算缩放比例
    const ratio = Math.min(maxWidth / width, maxHeight / height)

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    }
  }

  /**
   * Canvas 转 Blob
   */
  _canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas 转换失败'))
          }
        },
        mimeType,
        quality
      )
    })
  }

  /**
   * 压缩到目标大小
   * 通过二分法调整质量参数
   */
  async _compressToTargetSize(canvas, mimeType, currentSize, targetSize) {
    let minQuality = 0.1
    let maxQuality = 0.9
    let bestBlob = null
    let iterations = 0
    const maxIterations = 10

    while (iterations < maxIterations && maxQuality - minQuality > 0.01) {
      const quality = (minQuality + maxQuality) / 2
      const blob = await this._canvasToBlob(canvas, mimeType, quality)

      if (blob.size <= targetSize) {
        bestBlob = blob
        minQuality = quality
      } else {
        maxQuality = quality
      }

      iterations++
    }

    // 如果找到合适的压缩结果，返回；否则返回最低质量的版本
    if (bestBlob) {
      return bestBlob
    }

    return this._canvasToBlob(canvas, mimeType, minQuality)
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(file) {
    try {
      const img = await this._loadImage(file)
      return {
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type,
        name: file.name
      }
    } catch (error) {
      return null
    }
  }

  /**
   * 预估压缩后大小
   */
  estimateCompressedSize(originalSize, width, height, targetWidth, targetHeight, quality = 0.9) {
    // 简单估算：按像素数和质量比例计算
    const pixelRatio = (targetWidth * targetHeight) / (width * height)
    const qualityFactor = quality
    return Math.round(originalSize * pixelRatio * qualityFactor)
  }
}

// 导出单例
export const imageCompressor = new ImageCompressor()

// 也导出类
export { ImageCompressor }
