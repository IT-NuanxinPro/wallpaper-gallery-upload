/**
 * API 凭证管理 Store
 * 负责管理 Cloudflare API 凭证的存储、加密和验证
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AI_CONFIG } from '@/config/ai-config'

const STORAGE_KEY = 'ai_credentials'
const ENCRYPTION_KEY = 'ai_credentials_encryption_key'

export const useCredentialsStore = defineStore('credentials', () => {
  // State
  const mode = ref('manual') // 'manual' | 'shared'
  const accountId = ref('')
  const apiToken = ref('')
  const workerUrl = ref(AI_CONFIG.workerUrl)
  const encrypted = ref(true)
  const lastVerified = ref(null)
  const loading = ref(false)
  const loaded = ref(false)

  // Computed
  // 是否为生产环境（Cloudflare Pages 部署）
  const isProduction = computed(() => {
    return import.meta.env.PROD
  })

  // 环境变量中是否有凭证
  const hasEnvCredentials = computed(() => {
    const envAccountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
    const envApiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN
    return !!(envAccountId && envApiToken)
  })

  const hasCredentials = computed(() => {
    // 1. 生产环境 + 共享模式：检查环境变量
    if (isProduction.value && mode.value === 'shared') {
      return hasEnvCredentials.value
    }
    // 2. 开发环境 + 共享模式：也检查环境变量（.env.local）
    if (mode.value === 'shared') {
      return hasEnvCredentials.value
    }
    // 3. 手动模式：检查用户输入
    return !!(accountId.value && apiToken.value)
  })

  const credentialsSource = computed(() => {
    return mode.value === 'shared' ? '项目共享' : '手动输入'
  })

  /**
   * 生成加密密钥
   * 使用 Web Crypto API 生成 AES-GCM 密钥
   */
  async function generateEncryptionKey() {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      )

      // 导出密钥并存储
      const exportedKey = await window.crypto.subtle.exportKey('jwk', key)
      localStorage.setItem(ENCRYPTION_KEY, JSON.stringify(exportedKey))

      return key
    } catch (error) {
      console.error('[Credentials] Failed to generate encryption key:', error)
      throw new Error('生成加密密钥失败')
    }
  }

  /**
   * 获取加密密钥
   */
  async function getEncryptionKey() {
    try {
      const storedKey = localStorage.getItem(ENCRYPTION_KEY)

      if (!storedKey) {
        return await generateEncryptionKey()
      }

      const keyData = JSON.parse(storedKey)
      return await window.crypto.subtle.importKey(
        'jwk',
        keyData,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      console.error('[Credentials] Failed to get encryption key:', error)
      // 如果获取失败，生成新密钥
      return await generateEncryptionKey()
    }
  }

  /**
   * 加密数据
   * @param {string} data - 要加密的数据
   * @returns {Promise<string>} 加密后的数据（Base64）
   */
  async function encryptData(data) {
    try {
      const key = await getEncryptionKey()
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      // eslint-disable-next-line no-undef
      const encodedData = new TextEncoder().encode(data)

      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      )

      // 将 IV 和加密数据组合
      const combined = new Uint8Array(iv.length + encryptedData.byteLength)
      combined.set(iv, 0)
      combined.set(new Uint8Array(encryptedData), iv.length)

      // 转换为 Base64
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('[Credentials] Encryption failed:', error)
      throw new Error('加密失败')
    }
  }

  /**
   * 解密数据
   * @param {string} encryptedData - 加密的数据（Base64）
   * @returns {Promise<string>} 解密后的数据
   */
  async function decryptData(encryptedData) {
    try {
      const key = await getEncryptionKey()

      // 从 Base64 解码
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

      // 分离 IV 和加密数据
      const iv = combined.slice(0, 12)
      const data = combined.slice(12)

      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      )

      // eslint-disable-next-line no-undef
      return new TextDecoder().decode(decryptedData)
    } catch (error) {
      console.error('[Credentials] Decryption failed:', error)
      throw new Error('解密失败')
    }
  }

  /**
   * 保存凭证
   * @param {string} newAccountId - Account ID
   * @param {string} newApiToken - API Token
   * @param {string} newMode - 凭证模式
   */
  async function saveCredentials(newAccountId, newApiToken, newMode = 'manual') {
    try {
      accountId.value = newAccountId
      apiToken.value = newApiToken
      mode.value = newMode

      const encryptedAccountId = await encryptData(newAccountId)
      const encryptedApiToken = await encryptData(newApiToken)

      const encryptedCredentials = {
        mode: newMode,
        accountId: encryptedAccountId,
        apiToken: encryptedApiToken,
        workerUrl: workerUrl.value,
        encrypted: true,
        lastVerified: lastVerified.value
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedCredentials))

      return true
    } catch (error) {
      console.error('[Credentials] Failed to save credentials:', error)
      throw new Error('保存凭证失败')
    }
  }

  /**
   * 加载凭证
   * 优先从环境变量加载（协作者/管理员），否则从本地存储加载（只读用户）
   */
  async function loadCredentials() {
    // 防止重复加载
    if (loaded.value || loading.value) {
      return hasCredentials.value
    }

    loading.value = true

    try {
      // 1. 尝试从环境变量加载（项目共享凭证）
      const envAccountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
      const envApiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN
      const envWorkerUrl = import.meta.env.VITE_WORKER_URL

      if (envAccountId && envApiToken) {
        console.log('[Credentials] Loading from environment variables (shared credentials)')
        accountId.value = envAccountId
        apiToken.value = envApiToken
        workerUrl.value = envWorkerUrl || AI_CONFIG.workerUrl
        mode.value = 'shared'
        encrypted.value = false // 环境变量不需要加密
        loaded.value = true
        return true
      }

      // 2. 从本地存储加载（手动输入的凭证）
      const stored = localStorage.getItem(STORAGE_KEY)

      if (!stored) {
        console.log('[Credentials] No credentials found')
        loaded.value = true
        return false
      }

      const credentials = JSON.parse(stored)

      // 解密凭证
      if (credentials.encrypted) {
        accountId.value = await decryptData(credentials.accountId)
        apiToken.value = await decryptData(credentials.apiToken)
      } else {
        // 兼容旧版本未加密的数据
        accountId.value = credentials.accountId
        apiToken.value = credentials.apiToken
      }

      mode.value = credentials.mode || 'manual'
      workerUrl.value = credentials.workerUrl || AI_CONFIG.workerUrl
      lastVerified.value = credentials.lastVerified || null

      console.log('[Credentials] Loaded from local storage (manual credentials)')
      loaded.value = true
      return true
    } catch (error) {
      console.error('[Credentials] Failed to load credentials:', error)
      // 如果解密失败，清除存储
      clearCredentials()
      loaded.value = true
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 测试连接
   * 验证凭证是否有效
   */
  async function testConnection() {
    if (!hasCredentials.value) {
      throw new Error('请先配置 API 凭证')
    }

    try {
      // 使用一个简单的测试图片（1x1 透明 PNG）
      const testImage =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      const response = await fetch(workerUrl.value, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accountId.value,
          aiToken: apiToken.value,
          image: testImage,
          prompt: 'Test connection',
          model: '@cf/meta/llama-3.2-11b-vision-instruct',
          maxTokens: 10,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (errorData.errors && errorData.errors[0]) {
          const error = errorData.errors[0]

          // 401 错误表示凭证无效
          if (error.code === 401 || response.status === 401) {
            throw new Error('API 凭证无效，请检查 Account ID 和 API Token')
          }

          // 5016 错误表示需要同意协议（但凭证是有效的）
          if (error.code === 5016) {
            lastVerified.value = Date.now()
            await saveCredentials(accountId.value, apiToken.value, mode.value)
            return {
              success: true,
              message: '凭证有效（需要同意模型协议）'
            }
          }

          throw new Error(`连接失败: ${error.message}`)
        }

        throw new Error(`连接失败: ${response.status}`)
      }

      // 连接成功
      lastVerified.value = Date.now()
      await saveCredentials(accountId.value, apiToken.value, mode.value)

      return {
        success: true,
        message: '连接成功！'
      }
    } catch (error) {
      console.error('[Credentials] Test connection failed:', error)
      throw error
    }
  }

  /**
   * 清除凭证
   */
  function clearCredentials() {
    accountId.value = ''
    apiToken.value = ''
    mode.value = 'manual'
    lastVerified.value = null
    loaded.value = false

    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * 设置 Worker URL
   * @param {string} url - Worker URL
   */
  function setWorkerUrl(url) {
    workerUrl.value = url
  }

  /**
   * 获取凭证对象
   * @returns {Object} 凭证对象
   */
  function getCredentials() {
    return {
      mode: mode.value,
      accountId: accountId.value,
      apiToken: apiToken.value,
      workerUrl: workerUrl.value
    }
  }

  return {
    // State
    mode,
    accountId,
    apiToken,
    workerUrl,
    encrypted,
    lastVerified,
    loading,
    loaded,

    // Computed
    hasCredentials,
    credentialsSource,

    // Actions
    saveCredentials,
    loadCredentials,
    testConnection,
    clearCredentials,
    setWorkerUrl,
    getCredentials,
    encryptData,
    decryptData
  }
})
