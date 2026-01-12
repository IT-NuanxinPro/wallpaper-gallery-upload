import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'wallpaper_admin_history'
const MAX_RECORDS = 100

export const useHistoryStore = defineStore('history', () => {
  // 从 localStorage 加载历史记录
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        return data.records || []
      }
    } catch {
      // 忽略解析错误
    }
    return []
  }

  // 状态
  const records = ref(loadHistory())

  // 计算属性
  const successCount = computed(() => records.value.filter(r => r.status === 'success').length)
  const errorCount = computed(() => records.value.filter(r => r.status === 'error').length)
  const recentRecords = computed(() => records.value.slice(0, 10))

  // 保存到 localStorage
  function saveHistory() {
    const data = {
      version: 1,
      records: records.value,
      lastUpdated: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // 生成唯一 ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 添加记录
  function addRecord(record) {
    const newRecord = {
      id: generateId(),
      timestamp: Date.now(),
      ...record
    }

    // 添加到开头
    records.value.unshift(newRecord)

    // 限制数量
    if (records.value.length > MAX_RECORDS) {
      records.value = records.value.slice(0, MAX_RECORDS)
    }

    saveHistory()
    return newRecord
  }

  // 获取所有记录
  function getRecords() {
    return records.value
  }

  // 获取指定记录
  function getRecord(id) {
    return records.value.find(r => r.id === id)
  }

  // 按日期分组
  function getRecordsByDate() {
    const groups = {}

    records.value.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString('zh-CN')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(record)
    })

    return groups
  }

  // 清空历史
  function clearHistory() {
    records.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  // 删除单条记录
  function removeRecord(id) {
    const index = records.value.findIndex(r => r.id === id)
    if (index > -1) {
      records.value.splice(index, 1)
      saveHistory()
    }
  }

  return {
    // 状态
    records,
    // 计算属性
    successCount,
    errorCount,
    recentRecords,
    // 方法
    addRecord,
    getRecords,
    getRecord,
    getRecordsByDate,
    clearHistory,
    removeRecord
  }
})

// 导出常量
export { MAX_RECORDS }
