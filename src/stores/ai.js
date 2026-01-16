import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AI_CONFIG, getModelByKey } from '@/config/ai-config'
import { buildPrompt } from '@/utils/prompt-builder'
import { parseResponse } from '@/utils/response-parser'
import { useCredentialsStore } from './credentials'

export const useAIStore = defineStore('ai', () => {
  const analyzing = ref(false)
  const currentModel = ref(AI_CONFIG.defaultModel)
  const promptTemplate = ref(AI_CONFIG.defaultPromptTemplate)
  const results = ref([])
  const error = ref(null)

  const hasResults = computed(() => results.value.length > 0)
  const currentModelConfig = computed(() => getModelByKey(currentModel.value))

  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('请上传图片文件'))
        return
      }

      const reader = new FileReader()
      reader.onload = e => {
        // eslint-disable-next-line no-undef
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          let width = img.width
          let height = img.height
          const maxSize = AI_CONFIG.image.maxSize

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize
              width = maxSize
            } else {
              width = (width / height) * maxSize
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          resolve(canvas.toDataURL(AI_CONFIG.image.format, AI_CONFIG.image.quality))
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * 调用 AI API
   */
  async function callAI(imageBase64, prompt) {
    const credentialsStore = useCredentialsStore()

    if (!credentialsStore.hasCredentials) {
      throw new Error('请先配置 API 凭证')
    }

    const modelConfig = currentModelConfig.value
    if (!modelConfig) {
      throw new Error('无效的模型配置')
    }

    const credentials = credentialsStore.getCredentials()

    const response = await fetch(credentials.workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: credentials.accountId,
        aiToken: credentials.apiToken,
        image: imageBase64.split(',')[1],
        prompt,
        model: modelConfig.id,
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.errors?.[0]) {
        const err = errorData.errors[0]
        if (err.code === 3016) throw new Error('图片解码失败，请使用 JPG/PNG 格式')
        if (err.code === 5016) throw new Error('需要同意模型许可协议')
        throw new Error(`AI 错误 (${err.code}): ${err.message}`)
      }
      throw new Error(`请求失败: ${response.status}`)
    }

    const data = await response.json()
    if (data.error) throw new Error(data.message || data.error)
    if (data.errors?.length > 0) throw new Error(`AI 错误: ${data.errors[0].message}`)

    return data
  }

  /**
   * 分析单张图片
   */
  async function analyzeImage(file, primaryCategory, customPrompt = '') {
    analyzing.value = true
    error.value = null

    try {
      const imageBase64 = await compressImage(file)
      const prompt = buildPrompt(promptTemplate.value, primaryCategory, customPrompt)
      const apiResponse = await callAI(imageBase64, prompt)
      const parsedResult = parseResponse(apiResponse, currentModelConfig.value.parser)

      const result = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        imageUrl: URL.createObjectURL(file),
        imageName: file.name,
        imageSize: file.size,
        primary: primaryCategory,
        // 如果返回"通用"，使用建议的分类
        secondary:
          parsedResult.secondary === '通用' && parsedResult.suggestedCategory
            ? parsedResult.suggestedCategory
            : parsedResult.secondary,
        third:
          parsedResult.third === '通用' && parsedResult.suggestedThird
            ? parsedResult.suggestedThird
            : parsedResult.third,
        suggestedCategory: parsedResult.suggestedCategory,
        suggestedThird: parsedResult.suggestedThird,
        isNewCategory: parsedResult.isNewCategory,
        isNewThird: parsedResult.isNewThird,
        filenameSuggestions: parsedResult.filenameSuggestions,
        selectedFilename: parsedResult.filenameSuggestions[0],
        description: parsedResult.description,
        keywords: parsedResult.keywords,
        confidence: parsedResult.confidence,
        model: currentModel.value,
        promptTemplate: promptTemplate.value,
        raw: parsedResult.raw
      }

      results.value.unshift(result)
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      analyzing.value = false
    }
  }

  async function analyzeBatch(files, primaryCategory, customPrompt = '', onProgress = null) {
    const batchResults = []
    const batchErrors = []

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await analyzeImage(files[i], primaryCategory, customPrompt)
        batchResults.push(result)
      } catch (err) {
        batchErrors.push({ file: files[i].name, error: err.message })
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: files.length,
          progress: Math.round(((i + 1) / files.length) * 100)
        })
      }
    }

    return {
      results: batchResults,
      errors: batchErrors,
      total: files.length,
      success: batchResults.length,
      failed: batchErrors.length
    }
  }

  function setModel(modelKey) {
    currentModel.value = modelKey
  }

  function setPromptTemplate(templateId) {
    promptTemplate.value = templateId
  }

  function clearResults() {
    results.value = []
    error.value = null
  }

  return {
    analyzing,
    currentModel,
    promptTemplate,
    results,
    error,
    hasResults,
    currentModelConfig,
    analyzeImage,
    analyzeBatch,
    setModel,
    setPromptTemplate,
    clearResults
  }
})
