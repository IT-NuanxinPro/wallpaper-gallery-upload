/**
 * 图片预览URL管理器
 * 负责Blob URL的创建、追踪和清理，防止内存泄漏
 */
class PreviewManager {
  constructor() {
    // 存储文件ID到Blob URL的映射
    this.urlMap = new Map()
    // 存储文件ID到引用计数的映射
    this.refCountMap = new Map()
  }

  /**
   * 创建预览URL
   * @param {string} fileId - 文件唯一标识
   * @param {Blob} blob - 文件Blob对象
   * @returns {string} Blob URL
   */
  createPreview(fileId, blob) {
    // 如果已存在，增加引用计数并返回现有URL
    if (this.urlMap.has(fileId)) {
      const refCount = this.refCountMap.get(fileId)
      this.refCountMap.set(fileId, refCount + 1)
      return this.urlMap.get(fileId)
    }

    // 创建新的Blob URL
    const url = URL.createObjectURL(blob)
    this.urlMap.set(fileId, url)
    this.refCountMap.set(fileId, 1)

    console.log(`[PreviewManager] 创建预览: ${fileId}, 总数: ${this.urlMap.size}`)
    return url
  }

  /**
   * 释放预览URL
   * @param {string} fileId - 文件唯一标识
   */
  revokePreview(fileId) {
    if (!this.urlMap.has(fileId)) {
      return
    }

    // 减少引用计数
    const refCount = this.refCountMap.get(fileId)
    if (refCount > 1) {
      this.refCountMap.set(fileId, refCount - 1)
      return
    }

    // 引用计数为0，释放URL
    const url = this.urlMap.get(fileId)
    URL.revokeObjectURL(url)
    this.urlMap.delete(fileId)
    this.refCountMap.delete(fileId)

    console.log(`[PreviewManager] 释放预览: ${fileId}, 剩余: ${this.urlMap.size}`)
  }

  /**
   * 批量释放预览URL
   * @param {string[]} fileIds - 文件ID数组
   */
  revokePreviews(fileIds) {
    fileIds.forEach(fileId => this.revokePreview(fileId))
  }

  /**
   * 清理所有预览URL
   */
  revokeAll() {
    console.log(`[PreviewManager] 清理所有预览: ${this.urlMap.size}`)
    this.urlMap.forEach(url => {
      URL.revokeObjectURL(url)
    })
    this.urlMap.clear()
    this.refCountMap.clear()
  }

  /**
   * 获取当前管理的URL数量
   * @returns {number}
   */
  getUrlCount() {
    return this.urlMap.size
  }

  /**
   * 获取指定文件的预览URL
   * @param {string} fileId - 文件唯一标识
   * @returns {string|null}
   */
  getPreviewUrl(fileId) {
    return this.urlMap.get(fileId) || null
  }
}

// 导出单例
export const previewManager = new PreviewManager()

// 用于测试或特殊场景创建新实例
export default PreviewManager
