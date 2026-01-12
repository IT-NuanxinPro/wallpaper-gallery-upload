/**
 * 全局错误处理组合式函数
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ErrorType,
  registerErrorHandler,
  registerTokenExpiredHandler,
  registerRateLimitHandler,
  handleError as globalHandleError,
  getFriendlyMessage
} from '@/utils/errorHandler'
import { useAuthStore } from '@/stores/auth'

export function useErrorHandler() {
  const router = useRouter()
  const authStore = useAuthStore()

  const lastError = ref(null)
  const rateLimitResetTime = ref(null)
  const rateLimitCountdown = ref(0)

  let countdownTimer = null
  let unregisterHandler = null

  // 显示错误消息
  const showError = error => {
    const message = getFriendlyMessage(error)
    ElMessage.error({
      message,
      duration: 5000,
      showClose: true
    })
  }

  // 处理 Token 过期
  const handleTokenExpired = async error => {
    lastError.value = error

    ElMessage.warning({
      message: '登录已过期，请重新登录',
      duration: 3000
    })

    // 清除认证状态
    await authStore.logout()

    // 跳转到登录页
    router.push('/login')
  }

  // 处理 Rate Limit
  const handleRateLimit = error => {
    lastError.value = error

    if (error.details?.resetTime) {
      rateLimitResetTime.value = error.details.resetTime
      startCountdown()
    }

    ElMessage.warning({
      message: `API 请求过于频繁，请 ${rateLimitCountdown.value || '稍后'} 秒后再试`,
      duration: 10000
    })
  }

  // 开始倒计时
  const startCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }

    const updateCountdown = () => {
      if (!rateLimitResetTime.value) {
        rateLimitCountdown.value = 0
        return
      }

      const now = Date.now()
      const resetTime =
        rateLimitResetTime.value instanceof Date
          ? rateLimitResetTime.value.getTime()
          : rateLimitResetTime.value

      const remaining = Math.max(0, Math.ceil((resetTime - now) / 1000))
      rateLimitCountdown.value = remaining

      if (remaining <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
        rateLimitResetTime.value = null
      }
    }

    updateCountdown()
    countdownTimer = setInterval(updateCountdown, 1000)
  }

  // 通用错误处理
  const handleError = error => {
    lastError.value = error
    showError(error)
  }

  // 手动处理错误
  const processError = error => {
    return globalHandleError(error)
  }

  // 清除错误状态
  const clearError = () => {
    lastError.value = null
  }

  // 设置全局错误处理
  onMounted(() => {
    // 注册通用错误处理器
    unregisterHandler = registerErrorHandler(handleError)

    // 注册特殊错误处理器
    registerTokenExpiredHandler(handleTokenExpired)
    registerRateLimitHandler(handleRateLimit)

    // 捕获未处理的 Promise 错误
    window.addEventListener('unhandledrejection', onUnhandledRejection)
  })

  onUnmounted(() => {
    if (unregisterHandler) {
      unregisterHandler()
    }
    if (countdownTimer) {
      clearInterval(countdownTimer)
    }
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  })

  // 处理未捕获的 Promise 错误
  const onUnhandledRejection = event => {
    console.error('Unhandled promise rejection:', event.reason)
    // 阻止默认行为（控制台报错）
    event.preventDefault()
    // 处理错误
    processError(event.reason)
  }

  return {
    lastError,
    rateLimitResetTime,
    rateLimitCountdown,
    handleError: processError,
    showError,
    clearError,
    ErrorType
  }
}

export default useErrorHandler
