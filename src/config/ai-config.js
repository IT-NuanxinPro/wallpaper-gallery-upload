/**
 * AI 模型配置
 * 定义支持的 Cloudflare AI 视觉模型及其参数
 */

/**
 * AI 模型配置
 */
export const AI_MODELS = {
  // Llama 3.2 11B Vision - 默认模型，最强大
  'llama-3.2': {
    id: '@cf/meta/llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 11B Vision',
    description: '最强大，准确度高，速度中等',
    speed: 'medium',
    accuracy: 'high',
    cost: 'medium',
    parser: 'llama',
    maxTokens: 10000,
    temperature: 0.3,
    recommended: true
  }
}

/**
 * 默认配置
 */
export const AI_CONFIG = {
  // 默认模型
  defaultModel: 'llama-3.2',

  // 默认提示词模板
  defaultPromptTemplate: 'default',

  // 图片处理配置
  image: {
    maxSize: 1024,
    quality: 0.8,
    format: 'image/jpeg'
  },

  // Worker URL
  workerUrl: 'https://ai-proxy.han1569250882.workers.dev'
}

/**
 * 获取模型列表
 * @returns {Array} 模型列表
 */
export function getModelList() {
  return Object.entries(AI_MODELS).map(([key, model]) => ({
    key,
    ...model
  }))
}

/**
 * 根据 key 获取模型配置
 * @param {string} modelKey - 模型 key
 * @returns {Object|null} 模型配置
 */
export function getModelByKey(modelKey) {
  return AI_MODELS[modelKey] || null
}

/**
 * 获取推荐模型
 * @returns {Object} 推荐模型配置
 */
export function getRecommendedModel() {
  const recommended = Object.entries(AI_MODELS).find(([, model]) => model.recommended)
  return recommended ? { key: recommended[0], ...recommended[1] } : null
}

/**
 * 验证模型配置是否有效
 * @param {Object} model - 模型配置
 * @returns {boolean} 是否有效
 */
export function isValidModel(model) {
  return (
    model &&
    typeof model.id === 'string' &&
    typeof model.name === 'string' &&
    typeof model.parser === 'string' &&
    model.parser === 'llama'
  )
}

/**
 * 速度等级映射
 */
export const SPEED_LEVELS = {
  medium: { label: '中等', value: 2, color: '#e6a23c' },
  slow: { label: '慢', value: 1, color: '#f56c6c' }
}

/**
 * 准确度等级映射
 */
export const ACCURACY_LEVELS = {
  high: { label: '高', value: 3, color: '#67c23a' },
  medium: { label: '中等', value: 2, color: '#e6a23c' },
  low: { label: '低', value: 1, color: '#f56c6c' }
}

/**
 * 成本等级映射
 */
export const COST_LEVELS = {
  medium: { label: '中等', value: 3, color: '#e6a23c' },
  high: { label: '高', value: 4, color: '#f56c6c' }
}
