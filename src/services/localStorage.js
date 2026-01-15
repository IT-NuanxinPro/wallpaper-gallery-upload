/**
 * 本地存储服务
 * 用于存储上传历史等数据
 */

const STORAGE_KEY = 'wallpaper_studio_data'

class LocalStorageService {
  constructor() {
    this.data = null
    this.saveTimer = null
    this.saveDelay = 1000 // 1秒防抖
  }

  /**
   * 初始化 - 从 localStorage 加载数据
   */
  init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.data = JSON.parse(stored)
      } else {
        this.data = this.getDefaultData()
        this.saveImmediate()
      }
      return this.data
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
      this.data = this.getDefaultData()
      return this.data
    }
  }

  /**
   * 获取默认数据结构
   */
  getDefaultData() {
    return {
      version: 1,
      uploads: [],
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * 保存数据（带防抖）
   */
  save() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveImmediate()
    }, this.saveDelay)
  }

  /**
   * 立即保存数据
   */
  saveImmediate() {
    if (!this.data) {
      return false
    }

    try {
      this.data.updatedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
      return true
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      return false
    }
  }

  /**
   * 添加上传记录
   */
  addUploadRecord(record) {
    if (!this.data) {
      this.init()
    }

    const newRecord = {
      id: this.generateId(),
      ...record,
      uploadedAt: new Date().toISOString()
    }

    // 添加到开头
    this.data.uploads.unshift(newRecord)

    // 限制数量（保留最近 500 条）
    if (this.data.uploads.length > 500) {
      this.data.uploads = this.data.uploads.slice(0, 500)
    }

    // 触发保存
    this.save()

    return newRecord
  }

  /**
   * 批量添加上传记录
   */
  addUploadRecords(records) {
    if (!this.data) {
      this.init()
    }

    const newRecords = records.map(record => ({
      id: this.generateId(),
      ...record,
      uploadedAt: new Date().toISOString()
    }))

    // 添加到开头
    this.data.uploads.unshift(...newRecords)

    // 限制数量
    if (this.data.uploads.length > 500) {
      this.data.uploads = this.data.uploads.slice(0, 500)
    }

    // 触发保存
    this.save()

    return newRecords
  }

  /**
   * 获取上传记录
   */
  getUploadRecords(limit = 100) {
    if (!this.data) {
      this.init()
    }
    return this.data.uploads.slice(0, limit)
  }

  /**
   * 按日期分组获取记录
   */
  getUploadsByDate() {
    if (!this.data) {
      this.init()
    }

    const groups = {}
    this.data.uploads.forEach(record => {
      const date = new Date(record.uploadedAt).toLocaleDateString('zh-CN')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(record)
    })

    return groups
  }

  /**
   * 删除记录
   */
  removeRecord(id) {
    if (!this.data) {
      this.init()
    }

    const index = this.data.uploads.findIndex(r => r.id === id)
    if (index > -1) {
      this.data.uploads.splice(index, 1)
      this.save()
    }
  }

  /**
   * 清空所有记录
   */
  clearRecords() {
    if (!this.data) {
      this.init()
    }

    this.data.uploads = []
    this.save()
  }

  /**
   * 获取/设置配置
   */
  getSetting(key, defaultValue = null) {
    if (!this.data) {
      this.init()
    }
    return this.data.settings[key] ?? defaultValue
  }

  setSetting(key, value) {
    if (!this.data) {
      this.init()
    }
    this.data.settings[key] = value
    this.save()
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    if (!this.data) {
      this.init()
    }

    const stats = {
      total: this.data.uploads.length,
      byDate: {},
      bySeries: { desktop: 0, mobile: 0, avatar: 0 }
    }

    this.data.uploads.forEach(record => {
      // 按日期统计
      const date = new Date(record.uploadedAt).toLocaleDateString('zh-CN')
      stats.byDate[date] = (stats.byDate[date] || 0) + 1

      // 按系列统计
      if (record.series && stats.bySeries[record.series] !== undefined) {
        stats.bySeries[record.series]++
      }
    })

    return stats
  }

  /**
   * 是否已初始化
   */
  isInitialized() {
    return !!this.data
  }

  /**
   * 清理
   */
  cleanup() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
  }
}

// 导出单例
export const localStorageService = new LocalStorageService()
export default localStorageService
