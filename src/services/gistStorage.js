/**
 * GitHub Gist 存储服务
 * 用于跨设备同步上传历史等数据
 */

const API_BASE = 'https://api.github.com'
const GIST_FILENAME = 'wallpaper-studio-data.json'
const GIST_DESCRIPTION = 'Wallpaper Studio 数据存储（请勿手动修改）'

class GistStorageService {
  constructor() {
    this.token = null
    this.gistId = null
    this.data = null
    this.loading = false
    this.saving = false
    // 防抖保存
    this.saveTimer = null
    this.saveDelay = 2000 // 2秒防抖
  }

  /**
   * 设置 Token
   */
  setToken(token) {
    this.token = token
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    return {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`
    }
  }

  /**
   * 初始化 - 查找或创建 Gist
   */
  async init() {
    if (!this.token) {
      throw new Error('Token not set')
    }

    this.loading = true
    try {
      // 先尝试查找已有的 Gist
      const existingGist = await this.findGist()
      if (existingGist) {
        this.gistId = existingGist.id
        this.data = this.parseGistData(existingGist)
        return this.data
      }

      // 没有找到，创建新的
      const newGist = await this.createGist()
      this.gistId = newGist.id
      this.data = this.getDefaultData()
      return this.data
    } finally {
      this.loading = false
    }
  }

  /**
   * 查找已有的 Gist
   */
  async findGist() {
    const response = await fetch(`${API_BASE}/gists?per_page=100`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch gists')
    }

    const gists = await response.json()
    return gists.find(g => g.files && g.files[GIST_FILENAME])
  }

  /**
   * 创建新 Gist
   */
  async createGist() {
    const response = await fetch(`${API_BASE}/gists`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(this.getDefaultData(), null, 2)
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create gist')
    }

    return response.json()
  }

  /**
   * 解析 Gist 数据
   */
  parseGistData(gist) {
    try {
      const file = gist.files[GIST_FILENAME]
      if (file && file.content) {
        return JSON.parse(file.content)
      }
    } catch {
      console.warn('Failed to parse gist data, using default')
    }
    return this.getDefaultData()
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
   * 保存数据到 Gist（带防抖）
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
   * 立即保存数据到 Gist
   */
  async saveImmediate() {
    if (!this.gistId || !this.data || this.saving) {
      return
    }

    this.saving = true
    try {
      this.data.updatedAt = new Date().toISOString()

      const response = await fetch(`${API_BASE}/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(this.data, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save gist')
      }

      return true
    } catch (error) {
      console.error('Failed to save to gist:', error)
      return false
    } finally {
      this.saving = false
    }
  }

  /**
   * 添加上传记录
   */
  addUploadRecord(record) {
    if (!this.data) {
      this.data = this.getDefaultData()
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
      this.data = this.getDefaultData()
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
    if (!this.data) return []
    return this.data.uploads.slice(0, limit)
  }

  /**
   * 按日期分组获取记录
   */
  getUploadsByDate() {
    if (!this.data) return {}

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
    if (!this.data) return

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
    if (!this.data) return

    this.data.uploads = []
    this.save()
  }

  /**
   * 获取/设置配置
   */
  getSetting(key, defaultValue = null) {
    if (!this.data) return defaultValue
    return this.data.settings[key] ?? defaultValue
  }

  setSetting(key, value) {
    if (!this.data) {
      this.data = this.getDefaultData()
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
      return { total: 0, byDate: {}, bySeries: {} }
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
    return !!this.gistId && !!this.data
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
export const gistStorage = new GistStorageService()
export default gistStorage
