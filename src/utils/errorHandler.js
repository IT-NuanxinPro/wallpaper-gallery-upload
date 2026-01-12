/**
 * 全局错误处理工具
 */

// 错误类型枚举
export const ErrorType = {
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DUPLICATE_FILE: 'DUPLICATE_FILE',
  API_ERROR: 'API_ERROR',
  UNKNOWN: 'UNKNOWN'
}

// 错误消息映射
export const ERROR_MESSAGES = {
  [ErrorType.AUTH_FAILED]: '登录失败，请重试',
  [ErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [ErrorType.RATE_LIMITED]: 'API 请求过于频繁，请稍后再试',
  [ErrorType.PERMISSION_DENIED]: '没有权限执行此操作',
  [ErrorType.FILE_TOO_LARGE]: '文件大小超过限制（最大 25MB）',
  [ErrorType.INVALID_FILE_TYPE]: '不支持的文件格式',
  [ErrorType.DUPLICATE_FILE]: '文件已存在',
  [ErrorType.API_ERROR]: '服务器错误，请稍后再试',
  [ErrorType.UNKNOWN]: '发生未知错误'
}

// 错误是否可重试
export const RETRYABLE_ERRORS = [
  ErrorType.NETWORK_ERROR,
  ErrorType.RATE_LIMITED,
  ErrorType.API_ERROR
]

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(type, message, details = null, retryable = false) {
    super(message || ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN])
    this.type = type
    this.details = details
    this.retryable = retryable || RETRYABLE_ERRORS.includes(type)
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp
    }
  }
}

/**
 * 解析 GitHub API 错误
 */
export function parseGitHubError(error) {
  if (!error) {
    return new AppError(ErrorType.UNKNOWN)
  }

  // 已经是 AppError
  if (error instanceof AppError) {
    return error
  }

  // GitHub 服务返回的错误对象
  if (error.type) {
    switch (error.type) {
      case 'RATE_LIMITED':
        return new AppError(
          ErrorType.RATE_LIMITED,
          error.message,
          { resetTime: error.resetTime },
          true
        )
      case 'TOKEN_EXPIRED':
        return new AppError(ErrorType.TOKEN_EXPIRED, error.message)
      case 'NETWORK_ERROR':
        return new AppError(ErrorType.NETWORK_ERROR, error.message, null, true)
      case 'API_ERROR':
        if (error.status === 403) {
          return new AppError(ErrorType.PERMISSION_DENIED, error.message)
        }
        if (error.status === 404) {
          return new AppError(ErrorType.API_ERROR, '资源不存在')
        }
        return new AppError(ErrorType.API_ERROR, error.message, null, true)
      default:
        return new AppError(ErrorType.UNKNOWN, error.message)
    }
  }

  // 普通 Error 对象
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new AppError(ErrorType.NETWORK_ERROR, null, null, true)
    }
    return new AppError(ErrorType.UNKNOWN, error.message)
  }

  // 字符串错误
  if (typeof error === 'string') {
    return new AppError(ErrorType.UNKNOWN, error)
  }

  return new AppError(ErrorType.UNKNOWN)
}

/**
 * 获取用户友好的错误消息
 */
export function getFriendlyMessage(error) {
  const appError = parseGitHubError(error)
  return appError.message
}

/**
 * 错误处理器回调存储
 */
let errorHandlers = []
let tokenExpiredHandler = null
let rateLimitHandler = null

/**
 * 注册全局错误处理器
 */
export function registerErrorHandler(handler) {
  errorHandlers.push(handler)
  return () => {
    errorHandlers = errorHandlers.filter(h => h !== handler)
  }
}

/**
 * 注册 Token 过期处理器
 */
export function registerTokenExpiredHandler(handler) {
  tokenExpiredHandler = handler
}

/**
 * 注册 Rate Limit 处理器
 */
export function registerRateLimitHandler(handler) {
  rateLimitHandler = handler
}

/**
 * 处理错误
 */
export function handleError(error) {
  const appError = parseGitHubError(error)

  // 特殊错误处理
  if (appError.type === ErrorType.TOKEN_EXPIRED && tokenExpiredHandler) {
    tokenExpiredHandler(appError)
    return appError
  }

  if (appError.type === ErrorType.RATE_LIMITED && rateLimitHandler) {
    rateLimitHandler(appError)
    return appError
  }

  // 通知所有注册的处理器
  errorHandlers.forEach(handler => {
    try {
      handler(appError)
    } catch (e) {
      console.error('Error handler failed:', e)
    }
  })

  return appError
}

/**
 * 安全执行异步操作
 */
export async function safeAsync(asyncFn, fallback = null) {
  try {
    return await asyncFn()
  } catch (error) {
    handleError(error)
    return fallback
  }
}

/**
 * 创建带错误处理的包装函数
 */
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw handleError(error)
    }
  }
}
