import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { githubService } from '@/services/github'

// 工作流仓库配置
const WORKFLOW_REPO = {
  owner: 'IT-NuanxinPro',
  repo: 'wallpaper-gallery-workflow'
}

// 状态轮询间隔
const POLL_INTERVAL = 5000 // 5秒

export const useWorkflowStore = defineStore('workflow', () => {
  // 状态
  const loading = ref(false)
  const triggering = ref(false)
  const latestRun = ref(null)
  const runningWorkflow = ref(null)
  const error = ref(null)
  const pollTimer = ref(null)

  // 计算属性
  const isRunning = computed(() => {
    return runningWorkflow.value !== null
  })

  const statusText = computed(() => {
    if (!latestRun.value) return '未知'

    const { status, conclusion } = latestRun.value

    if (status === 'queued') return '排队中'
    if (status === 'in_progress') return '运行中'
    if (status === 'completed') {
      if (conclusion === 'success') return '成功'
      if (conclusion === 'failure') return '失败'
      if (conclusion === 'cancelled') return '已取消'
      return '已完成'
    }
    return status
  })

  const statusType = computed(() => {
    if (!latestRun.value) return 'info'

    const { status, conclusion } = latestRun.value

    if (status === 'queued' || status === 'in_progress') return 'warning'
    if (status === 'completed') {
      if (conclusion === 'success') return 'success'
      if (conclusion === 'failure') return 'danger'
      return 'info'
    }
    return 'info'
  })

  // 格式化时间
  function formatTime(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 检查工作流状态
  async function checkStatus() {
    loading.value = true
    error.value = null

    try {
      const result = await githubService.hasRunningWorkflow(WORKFLOW_REPO.owner, WORKFLOW_REPO.repo)

      runningWorkflow.value = result.runningWorkflow
      latestRun.value = result.latestRun

      return result
    } catch (e) {
      error.value = e.message || '检查状态失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 触发工作流
  async function trigger(message = '') {
    if (triggering.value || isRunning.value) {
      throw new Error('工作流正在运行中，请稍后再试')
    }

    triggering.value = true
    error.value = null

    try {
      await githubService.triggerWorkflow(
        WORKFLOW_REPO.owner,
        WORKFLOW_REPO.repo,
        'process-wallpapers',
        {
          message: message || `chore: update wallpapers [${new Date().toLocaleDateString('zh-CN')}]`
        }
      )

      // 触发后等待一下再检查状态
      await new Promise(r => setTimeout(r, 2000))
      await checkStatus()

      // 开始轮询状态
      startPolling()

      return true
    } catch (e) {
      error.value = e.message || '触发失败'
      throw e
    } finally {
      triggering.value = false
    }
  }

  // 开始轮询状态
  function startPolling() {
    stopPolling()

    pollTimer.value = setInterval(async () => {
      try {
        const result = await checkStatus()

        // 如果工作流完成，停止轮询
        if (!result.hasRunning) {
          stopPolling()
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }, POLL_INTERVAL)
  }

  // 停止轮询
  function stopPolling() {
    if (pollTimer.value) {
      clearInterval(pollTimer.value)
      pollTimer.value = null
    }
  }

  // 获取工作流运行链接
  function getRunUrl() {
    if (!latestRun.value) return null
    return latestRun.value.html_url
  }

  return {
    // 状态
    loading,
    triggering,
    latestRun,
    runningWorkflow,
    error,
    // 计算属性
    isRunning,
    statusText,
    statusType,
    // 方法
    checkStatus,
    trigger,
    startPolling,
    stopPolling,
    formatTime,
    getRunUrl
  }
})
