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
          error: null,
          // 每个文件独立的目标路径，默认使用全局设置
          targetPath: targetPath.value,
          targetSeries: series.value,
          targetL1: categoryL1.value,
          targetL2: categoryL2.value
        })
      } else {
        // 可以在这里触发错误提示
        console.warn(`文件验证失败: ${file.name} - ${validation.error}`)
      }
    }

    files.value.push(...validFiles)
    return validFiles
  }

  // 更新单个文件的目标路径
  function updateFileTarget(fileId, newSeries, l1, l2 = '') {
    const file = files.value.find(f => f.id === fileId)
    if (file && file.status === 'pending') {
      file.targetSeries = newSeries
      file.targetL1 = l1
      file.targetL2 = l2
      const parts = ['wallpaper', newSeries, l1]
      if (l2) parts.push(l2)
      file.targetPath = parts.join('/')
    }
  }

  // 批量更新文件目标路径（选中的文件）
  function updateFilesTarget(fileIds, newSeries, l1, l2 = '') {
    const parts = ['wallpaper', newSeries, l1]
    if (l2) parts.push(l2)
    const newPath = parts.join('/')

    fileIds.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file && file.status === 'pending') {
        file.targetSeries = newSeries
        file.targetL1 = l1
        file.targetL2 = l2
        file.targetPath = newPath
      }
    })
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

  // 批量移除文件
  function removeFiles(ids) {
    ids.forEach(id => {
      const index = files.value.findIndex(f => f.id === id)
      if (index > -1) {
        URL.revokeObjectURL(files.value[index].preview)
        files.value.splice(index, 1)
      }
    })
  }

  // 清空所有文件
  function clearFiles() {
    files.value.forEach(f => URL.revokeObjectURL(f.preview))
    files.value = []
  }

  // 清理成功上传的文件（释放内存）
  function clearSuccessFiles() {
    const successIds = files.value.filter(f => f.status === 'success').map(f => f.id)
    successIds.forEach(id => {
      const index = files.value.findIndex(f => f.id === id)
      if (index > -1) {
        URL.revokeObjectURL(files.value[index].preview)
        files.value.splice(index, 1)
      }
    })
    return successIds.length
  }

  // 检查文件是否存在
  async function checkDuplicate(filename) {
    const configStore = useConfigStore()
    const { owner, repo, branch } = configStore.config
    const path = `${targetPath.value}/${filename}`

    return githubService.checkFileExists(owner, repo, path, branch)
  }

  // 批量检查重复文件
  async function checkDuplicates(filenames) {
    const configStore = useConfigStore()
    const { owner, repo, branch } = configStore.config
    const duplicates = []

    for (const filename of filenames) {
      const path = `${targetPath.value}/${filename}`
      const exists = await githubService.checkFileExists(owner, repo, path, branch)
      if (exists) {
        duplicates.push(filename)
      }
    }

    return duplicates
  }

  // 计算文件内容 Hash（用于检测内容重复）
  async function computeFileHash(file) {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 检查本地上传记录（避免同一会话重复上传）
  const HASH_STORAGE_KEY = 'uploaded_hashes'
  const HASH_MAX_COUNT = 500 // 最多保留 500 条
  const HASH_EXPIRE_DAYS = 30 // 30 天后过期

  function getUploadedHashes() {
    try {
      const stored = localStorage.getItem(HASH_STORAGE_KEY)
      if (!stored) return {}

      const hashes = JSON.parse(stored)
      const now = Date.now()
      const expireMs = HASH_EXPIRE_DAYS * 24 * 60 * 60 * 1000

      // 过滤掉过期的记录
      const valid = {}
      for (const [hash, data] of Object.entries(hashes)) {
        if (now - data.time < expireMs) {
          valid[hash] = data
        }
      }

      // 如果有过期记录被清理，更新存储
      if (Object.keys(valid).length < Object.keys(hashes).length) {
        localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(valid))
      }

      return valid
    } catch {
      return {}
    }
  }

  function addUploadedHash(hash, filename, path) {
    const hashes = getUploadedHashes()
    hashes[hash] = { filename, path, time: Date.now() }

    // 超过上限时，删除最旧的记录
    const entries = Object.entries(hashes)
    if (entries.length > HASH_MAX_COUNT) {
      entries.sort((a, b) => b[1].time - a[1].time)
      const trimmed = Object.fromEntries(entries.slice(0, HASH_MAX_COUNT))
      localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(trimmed))
    } else {
      localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(hashes))
    }
  }

  function isHashUploaded(hash) {
    const hashes = getUploadedHashes()
    return hashes[hash] || null
  }

  // 清除上传记录（手动清理）
  function clearUploadedHashes() {
    localStorage.removeItem(HASH_STORAGE_KEY)
  }

  // 上传单个文件
  async function uploadFile(uploadFile) {
    const configStore = useConfigStore()
    const historyStore = useHistoryStore()
    const { owner, repo, branch } = configStore.config

    // 使用文件自己的目标路径，如果没有则使用全局的
    const fileTargetPath = uploadFile.targetPath || targetPath.value
    const fileSeries = uploadFile.targetSeries || series.value

    if (!fileTargetPath) {
      uploadFile.status = 'error'
      uploadFile.error = '未设置上传目录'
      return { success: false, errorType: 'NO_TARGET', error: uploadFile.error }
    }

    uploadFile.status = 'uploading'
    uploadFile.progress = 0

    // 模拟进度（GitHub API 不支持进度回调）
    const progressInterval = setInterval(() => {
      if (uploadFile.progress < 90) {
        uploadFile.progress += 10
      }
    }, 200)

    try {
      const path = `${fileTargetPath}/${uploadFile.name}`
      const message = `Upload: ${uploadFile.name}`

      // 计算文件 Hash 并检查是否已上传
      const hash = await computeFileHash(uploadFile.file)
      const existingUpload = isHashUploaded(hash)
      if (existingUpload) {
        clearInterval(progressInterval)
        uploadFile.status = 'error'
        uploadFile.error = `文件内容重复，已在 ${existingUpload.path} 上传过`
        return { success: false, errorType: 'DUPLICATE', error: uploadFile.error }
      }

      await githubService.uploadImage(owner, repo, path, uploadFile.file, message, branch)

      uploadFile.progress = 100
      uploadFile.status = 'success'

      // 清理进度定时器
      clearInterval(progressInterval)

      // 记录已上传的 Hash
      addUploadedHash(hash, uploadFile.name, path)

      // 添加到历史记录
      historyStore.addRecord({
        filename: uploadFile.name,
        category: fileTargetPath,
        series: fileSeries,
        status: 'success'
      })

      return { success: true }
    } catch (error) {
      // 清理进度定时器
      clearInterval(progressInterval)

      uploadFile.status = 'error'

      // 根据错误类型设置更具体的错误信息
      if (error.type === 'PERMISSION_DENIED') {
        uploadFile.error = '权限不足：您没有该仓库的写入权限'
      } else if (error.type === 'RATE_LIMITED') {
        uploadFile.error = 'API 请求过于频繁，请稍后重试'
      } else if (error.type === 'TOKEN_EXPIRED') {
        uploadFile.error = '登录已过期，请重新登录'
      } else if (error.type === 'NETWORK_ERROR') {
        uploadFile.error = '网络连接失败，请检查网络'
      } else if (error.message?.includes('sha') || error.message?.includes('already exists')) {
        uploadFile.error = '文件已存在，请勿重复上传'
      } else {
        uploadFile.error = error.message || '上传失败'
      }

      // 添加失败记录
      historyStore.addRecord({
        filename: uploadFile.name,
        category: fileTargetPath,
        series: fileSeries,
        status: 'error'
      })

      return { success: false, errorType: error.type, error: uploadFile.error }
    }
  }

  // 上传所有待上传文件
  async function uploadAll() {
    if (uploading.value || pendingFiles.value.length === 0) return

    // 检查是否所有待上传文件都有目标路径
    const filesWithoutTarget = pendingFiles.value.filter(f => !f.targetPath)
    if (filesWithoutTarget.length > 0) {
      throw new Error(`有 ${filesWithoutTarget.length} 个文件未设置上传目录`)
    }

    uploading.value = true
    const results = []
    let permissionError = false

    for (let i = 0; i < files.value.length; i++) {
      const file = files.value[i]
      if (file.status === 'pending') {
        currentFileIndex.value = i
        const result = await uploadFile(file)
        results.push({ file, ...result })

        // 如果是权限错误，停止后续上传
        if (result.errorType === 'PERMISSION_DENIED') {
          permissionError = true
          // 将剩余待上传文件标记为错误
          files.value.forEach(f => {
            if (f.status === 'pending') {
              f.status = 'error'
              f.error = '权限不足：您没有该仓库的写入权限'
            }
          })
          break
        }

        // 上传间隔，避免触发 API 限流
        if (i < files.value.length - 1) {
          await new Promise(r => setTimeout(r, UPLOAD_DELAY))
        }
      }
    }

    currentFileIndex.value = -1
    uploading.value = false

    // 返回结果，包含权限错误标记
    return { results, permissionError }
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
    removeFiles,
    clearFiles,
    checkDuplicate,
    uploadFile,
    uploadAll,
    retryFailed,
    setTarget,
    updateFileTarget,
    updateFilesTarget,
    getRateLimit,
    shouldWarnBatchUpload,
    estimateUploadTime,
    clearSuccessFiles,
    checkDuplicates,
    computeFileHash,
    isHashUploaded,
    clearUploadedHashes
  }
})

// 导出常量供外部使用
export { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, BATCH_WARNING_THRESHOLD }
