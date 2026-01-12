import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { githubService } from '@/services/github'

const STORAGE_KEY = 'wallpaper_admin_config'

// 默认配置
const DEFAULT_CONFIG = {
  owner: 'IT-NuanxinPro',
  repo: 'nuanXinProPic',
  branch: 'main',
  clientId: 'Ov23li2QrljIDmhjRkGU'
}

export const useConfigStore = defineStore('config', () => {
  // 从 localStorage 加载配置
  const loadConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : { ...DEFAULT_CONFIG }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  // 状态
  const config = ref(loadConfig())
  const validating = ref(false)
  const validationError = ref(null)

  // 计算属性
  const isConfigured = computed(() => {
    return !!(config.value.owner && config.value.repo && config.value.branch)
  })

  const repoFullName = computed(() => {
    return `${config.value.owner}/${config.value.repo}`
  })

  // 保存配置到 localStorage
  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
  }

  // 设置配置
  function setConfig(newConfig) {
    config.value = { ...config.value, ...newConfig }
    saveConfig()
  }

  // 重置为默认配置
  function resetConfig() {
    config.value = { ...DEFAULT_CONFIG }
    saveConfig()
  }

  // 验证配置（检查仓库是否存在和权限）
  async function validateConfig() {
    if (!isConfigured.value) {
      validationError.value = '请填写完整的仓库配置'
      return false
    }

    validating.value = true
    validationError.value = null

    try {
      // 检查仓库是否存在
      await githubService.getContents(
        config.value.owner,
        config.value.repo,
        '',
        config.value.branch
      )
      return true
    } catch (error) {
      if (error.status === 404) {
        validationError.value = '仓库不存在或无访问权限'
      } else if (error.type === 'TOKEN_EXPIRED') {
        validationError.value = '登录已过期，请重新登录'
      } else {
        validationError.value = error.message || '验证失败'
      }
      return false
    } finally {
      validating.value = false
    }
  }

  // 验证仓库名格式
  function isValidRepoName(name) {
    if (!name || typeof name !== 'string') return false
    // GitHub 仓库名规则：字母、数字、连字符、下划线、点
    return /^[a-zA-Z0-9._-]+$/.test(name)
  }

  // 验证用户名格式
  function isValidOwnerName(name) {
    if (!name || typeof name !== 'string') return false
    // GitHub 用户名规则：字母、数字、连字符
    return /^[a-zA-Z0-9-]+$/.test(name)
  }

  return {
    // 状态
    config,
    validating,
    validationError,
    // 计算属性
    isConfigured,
    repoFullName,
    // 方法
    setConfig,
    resetConfig,
    validateConfig,
    isValidRepoName,
    isValidOwnerName
  }
})
