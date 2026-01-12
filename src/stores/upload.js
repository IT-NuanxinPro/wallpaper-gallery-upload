import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { githubService } from '@/services/github'
import { useConfigStore } from './config'
import { useHistoryStore } from './history'

// 允许的文件类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const UPLOAD_DELAY = 500 // 上传间隔 500ms，避免触发限流
const BATCH_WARNING_THRESHOLD = 50 // 超过 50 张提示警告

export const useUploadStore = defineStore('upload', () => {
  // 状态
  const files = ref([])
  const uploading = ref(false)
  const currentFileIndex = ref(-1)

  // 目标路径
  const series = ref('desktop') // desktop | mobile | avatar
  const categoryL1 = ref('')
  const categoryL2 = ref('')

  // 计算属性
  const targetPath = computed(() => {
    if (!categoryL1.value) return ''
    const parts = ['wallpaper', series.value, categoryL1.value]
    if (categoryL2.value) parts.push(categoryL2.value)
    return parts.join('/')
  })

  const totalProgress = computed(() => {
    if (files.value.length === 0) return 0
    const total = files.value.reduce((sum, f) => sum + f.progress, 0)
    return Math.round(total / files.value.length)
  })

  const pendingFiles = computed(() => files.value.filter(f => f.status === 'pending'))
  const uploadingFiles = computed(() => files.value.filter(f => f.status === 'uploading'))
  const successFiles = computed(() => files.value.filter(f => f.status === 'success'))
  const errorFiles = computed(() => files.value.filter(f => f.status === 'error'))

  // 生成唯一 ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 获取文件扩展名
  function getExtension(filename) {
    return filename.split('.').pop().toLowerCase()
  }

  // 验证文件
  function validateFile(file) {
    // 检查文件类型
    const ext = getExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `不支持的文件格式: ${ext}` }
    }

    // 检查 MIME 类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: `不支持的文件类型: ${file.type}` }
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `文件大小超过限制 (最大 25MB)` }
    }

    return { valid: true }
  }

  // 创建预览 URL
  function createPreview(file) {
    return URL.createObjectURL(file)
  }

  // 添加文件
  function addFiles(newFiles) {
    const validFiles = []

    for (const file of newFiles) {
      const validation = validateFile(file)

      if (validation.valid) {
        validFiles.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          preview: createPreview(file),
          status: 'pending',
          progress: 0,
          error: null
        })
      } else {
        // 可以在这里触发错误提示
        console.warn(`文件验证失败: ${file.name} - ${validation.error}`)
      }
    }

    files.value.push(...validFiles)
    return validFiles
  }

  // 移除文件
  function removeFile(id) {
    const index = files.value.findIndex(f => f.id === id)
    if (index > -1) {
      // 释放预览 URL
      URL.revokeObjectURL(files.value[index].preview)
      files.value.splice(index, 1)
    }
  }

  // 清空所有文件
  function clearFiles() {
    files.value.forEach(f => URL.revokeObjectURL(f.preview))
    files.value = []
  }

  // 检查文件是否存在
  async function checkDuplicate(filename) {
    const configStore = useConfigStore()
    const { owner, repo, branch } = configStore.config
    const path = `${targetPath.value}/${filename}`

    return githubService.checkFileExists(owner, repo, path, branch)
  }

  // 上传单个文件
  async function uploadFile(uploadFile) {
    const configStore = useConfigStore()
    const historyStore = useHistoryStore()
    const { owner, repo, branch } = configStore.config

    uploadFile.status = 'uploading'
    uploadFile.progress = 0

    try {
      const path = `${targetPath.value}/${uploadFile.name}`
      const message = `Upload: ${uploadFile.name}`

      // 模拟进度（GitHub API 不支持进度回调）
      const progressInterval = setInterval(() => {
        if (uploadFile.progress < 90) {
          uploadFile.progress += 10
        }
      }, 200)

      await githubService.uploadImage(owner, repo, path, uploadFile.file, message, branch)

      clearInterval(progressInterval)
      uploadFile.progress = 100
      uploadFile.status = 'success'

      // 添加到历史记录
      historyStore.addRecord({
        filename: uploadFile.name,
        category: targetPath.value,
        series: series.value,
        status: 'success'
      })

      return true
    } catch (error) {
      uploadFile.status = 'error'
      uploadFile.error = error.message || '上传失败'

      // 添加失败记录
      historyStore.addRecord({
        filename: uploadFile.name,
        category: targetPath.value,
        series: series.value,
        status: 'error'
      })

      return false
    }
  }

  // 上传所有待上传文件
  async function uploadAll() {
    if (uploading.value || pendingFiles.value.length === 0) return
    if (!targetPath.value) {
      throw new Error('请先选择上传目录')
    }

    uploading.value = true
    const results = []

    for (let i = 0; i < files.value.length; i++) {
      const file = files.value[i]
      if (file.status === 'pending') {
        currentFileIndex.value = i
        const success = await uploadFile(file)
        results.push({ file, success })

        // 上传间隔，避免触发 API 限流
        if (i < files.value.length - 1) {
          await new Promise(r => setTimeout(r, UPLOAD_DELAY))
        }
      }
    }

    currentFileIndex.value = -1
    uploading.value = false

    return results
  }

  // 获取 API 配额信息
  function getRateLimit() {
    return githubService.getRateLimit()
  }

  // 检查批量上传是否需要警告
  function shouldWarnBatchUpload(count) {
    return count > BATCH_WARNING_THRESHOLD
  }

  // 估算上传时间（秒）
  function estimateUploadTime(count) {
    // 每个文件约 2-3 秒（包含间隔）
    return Math.ceil(count * 2.5)
  }

  // 重试失败的文件
  async function retryFailed() {
    const failedFiles = errorFiles.value
    failedFiles.forEach(f => {
      f.status = 'pending'
      f.progress = 0
      f.error = null
    })

    return uploadAll()
  }

  // 设置目标分类
  function setTarget(newSeries, l1, l2 = '') {
    series.value = newSeries
    categoryL1.value = l1
    categoryL2.value = l2
  }

  return {
    // 状态
    files,
    uploading,
    currentFileIndex,
    series,
    categoryL1,
    categoryL2,
    // 计算属性
    targetPath,
    totalProgress,
    pendingFiles,
    uploadingFiles,
    successFiles,
    errorFiles,
    // 方法
    validateFile,
    addFiles,
    removeFile,
    clearFiles,
    checkDuplicate,
    uploadFile,
    uploadAll,
    retryFailed,
    setTarget,
    getRateLimit,
    shouldWarnBatchUpload,
    estimateUploadTime
  }
})

// 导出常量供外部使用
export { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, BATCH_WARNING_THRESHOLD }
