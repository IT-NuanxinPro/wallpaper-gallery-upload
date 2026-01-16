/**
 * AI 助手相关类型定义
 * 使用 JSDoc 提供类型提示
 */

/**
 * @typedef {Object} PromptTemplate
 * @property {string} id - 模板 ID
 * @property {string} name - 模板名称
 * @property {string} description - 模板描述
 * @property {string} template - 模板内容
 * @property {string[]} variables - 支持的变量列表
 * @property {boolean} builtin - 是否内置模板
 */

/**
 * @typedef {Object} AIModel
 * @property {string} id - 模型 ID（Cloudflare AI 模型标识）
 * @property {string} name - 模型名称
 * @property {string} description - 模型描述
 * @property {'very-fast'|'fast'|'medium'|'slow'} speed - 速度等级
 * @property {'high'|'medium'|'low'} accuracy - 准确度等级
 * @property {'very-low'|'low'|'medium'|'high'} cost - 成本等级
 * @property {'llama'|'llava'|'uform'} parser - 解析器类型
 * @property {number} maxTokens - 最大 token 数
 * @property {number} temperature - 温度参数
 * @property {boolean} [recommended] - 是否推荐
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} id - 唯一标识
 * @property {number} timestamp - 时间戳
 * @property {string} imageUrl - 图片 URL（本地 blob）
 * @property {string} imageName - 原始文件名
 * @property {number} imageSize - 文件大小（字节）
 * @property {string} primary - 主分类
 * @property {string} secondary - 二级分类
 * @property {string} third - 三级分类
 * @property {string[]} filenameSuggestions - 文件名建议列表
 * @property {string} selectedFilename - 用户选择的文件名
 * @property {string} description - 图片描述
 * @property {string[]} keywords - 关键词
 * @property {number} confidence - 置信度 (0-1)
 * @property {string} model - 使用的模型
 * @property {string} promptTemplate - 使用的提示词模板
 * @property {*} raw - 原始 API 响应
 */

/**
 * @typedef {Object} Credentials
 * @property {'manual'|'shared'} mode - 凭证模式
 * @property {string} accountId - Cloudflare Account ID
 * @property {string} apiToken - Cloudflare API Token
 * @property {string} workerUrl - Worker URL
 * @property {boolean} encrypted - 是否加密存储
 * @property {number} [lastVerified] - 最后验证时间
 */

/**
 * @typedef {Object} BatchJob
 * @property {string} id - 任务 ID
 * @property {File[]} files - 文件列表
 * @property {string} primaryCategory - 主分类
 * @property {string} promptTemplate - 提示词模板
 * @property {string} model - 使用的模型
 * @property {'pending'|'processing'|'paused'|'completed'|'failed'} status - 状态
 * @property {number} progress - 进度 (0-100)
 * @property {AnalysisResult[]} results - 成功的结果
 * @property {Array<{file: string, error: string}>} errors - 失败的记录
 * @property {number} startTime - 开始时间
 * @property {number} [endTime] - 结束时间
 * @property {number} concurrency - 并发数
 */

/**
 * @typedef {Object} ParsedResult
 * @property {string} secondary - 二级分类
 * @property {string} third - 三级分类
 * @property {string[]} filenameSuggestions - 文件名建议
 * @property {string} description - 描述
 * @property {string[]} keywords - 关键词
 * @property {number} confidence - 置信度
 * @property {*} raw - 原始数据
 */

/**
 * @typedef {Object} APIError
 * @property {number} code - 错误码
 * @property {string} message - 错误消息
 * @property {boolean} retry - 是否可重试
 * @property {number} [retryAfter] - 重试延迟（毫秒）
 * @property {number} [maxRetries] - 最大重试次数
 * @property {number} [retryDelay] - 重试延迟（毫秒）
 */

/**
 * @typedef {Object} HistoryFilter
 * @property {string|null} primaryCategory - 主分类筛选
 * @property {[number, number]|null} dateRange - 日期范围
 * @property {string} keyword - 关键词搜索
 */

/**
 * @typedef {'guest'|'read'|'write'|'admin'} PermissionLevel
 * 权限级别：
 * - guest: 未登录
 * - read: 只读权限
 * - write: 协作者（可写权限）
 * - admin: 管理员
 */

export {}
