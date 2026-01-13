import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { githubService } from '@/services/github'

export const useWorkflowStore = defineStore('workflow', () => {
  // 状态
  const loading = ref(false)
  const triggering = ref(false)
  const polling = ref(false)

  // 待处理图片信息
  const pendingInfo = ref({
    pendingCount: 0,
    pendingFiles: [],
    latestTag: null,
    latestTagInfo: null,
    message: null,
    error: null
  })

  // 上次发布统计
  const lastReleaseStats = ref({
    processedCount: 0,
    latestTag: null,
    previousTag: null
  })

  // stats.json 统计数据
  const statsData = ref(null)

  // 工作流运行状态
  const workflowStatus = ref({
    hasRunning: false,
    runningWorkflow: null,
    latestRun: null,
    justTriggered: false // 刚触发标记
  })

  // 本次会话上传成功的文件数
  const sessionUploadCount = ref(0)

  // 轮询定时器
  let pollTimer = null

  // 计算属性
  const canTrigger = computed(() => {
    return (
      !loading.value &&
      !triggering.value &&
      !workflowStatus.value.hasRunning &&
      !workflowStatus.value.justTriggered && // 刚触发时也禁用
      pendingInfo.value.pendingCount > 0
    )
  })

  const statusText = computed(() => {
    if (workflowStatus.value.hasRunning) {
      const run = workflowStatus.value.runningWorkflow
      if (run?.status === 'queued') return '排队中...'
      if (run?.status === 'in_progress') return '运行中...'
      return '处理中...'
    }
    return null
  })

  // 刷新待处理图片信息
  async function refreshPendingInfo(owner, repo, branch = 'main') {
    loading.value = true
    try {
      const info = await githubService.getPendingImages(owner, repo, branch)
      pendingInfo.value = info
      return info
    } catch (error) {
      pendingInfo.value.error = error.message
      throw error
    } finally {
      loading.value = false
    }
  }

  // 刷新上次发布统计
  async function refreshLastReleaseStats(owner, repo) {
    try {
      const stats = await githubService.getLastReleaseStats(owner, repo)
      lastReleaseStats.value = stats
      return stats
    } catch (error) {
      console.error('Failed to refresh last release stats:', error)
      return lastReleaseStats.value
    }
  }

  // 刷新 stats.json 数据
  async function refreshStatsData(owner, repo, branch = 'main') {
    try {
      const data = await githubService.getStats(owner, repo, branch)
      statsData.value = data
      return data
    } catch (error) {
      console.error('Failed to refresh stats data:', error)
      return null
    }
  }

  // 刷新工作流状态
  async function refreshWorkflowStatus(workflowOwner, workflowRepo) {
    try {
      const status = await githubService.hasRunningWorkflow(workflowOwner, workflowRepo)

      // 如果检测到运行中的工作流，清除 justTriggered 标记
      if (status.hasRunning) {
        workflowStatus.value = { ...status, justTriggered: false }
      } else {
        // 没有运行中的工作流，也清除 justTriggered（可能已完成或未启动）
        workflowStatus.value = { ...status, justTriggered: false }
      }

      return status
    } catch (error) {
      console.error('Failed to refresh workflow status:', error)
      return workflowStatus.value
    }
  }

  // 触发工作流
  async function triggerWorkflow(workflowOwner, workflowRepo, message = '', publisher = '') {
    if (!canTrigger.value) return false

    triggering.value = true
    try {
      await githubService.triggerWorkflow(workflowOwner, workflowRepo, 'process-wallpapers', {
        message: message || `chore: 处理 ${pendingInfo.value.pendingCount} 张新图片`,
        publisher: publisher || ''
      })

      // 立即标记为刚触发状态（禁用按钮）
      workflowStatus.value.justTriggered = true

      // 触发成功后开始轮询状态（延迟 3 秒开始，给 GitHub 时间启动工作流）
      setTimeout(() => {
        startPolling(workflowOwner, workflowRepo)
      }, 3000)

      return true
    } catch (error) {
      console.error('Failed to trigger workflow:', error)
      throw error
    } finally {
      triggering.value = false
    }
  }

  // 回滚到上一个 tag
  async function rollbackLastRelease(owner, repo) {
    loading.value = true
    try {
      const result = await githubService.rollbackToLastTag(owner, repo)
      return result
    } catch (error) {
      console.error('Failed to rollback:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 开始轮询工作流状态
  function startPolling(workflowOwner, workflowRepo, interval = 10000) {
    stopPolling()
    polling.value = true

    // 立即检查一次
    refreshWorkflowStatus(workflowOwner, workflowRepo)

    pollTimer = setInterval(async () => {
      const status = await refreshWorkflowStatus(workflowOwner, workflowRepo)

      // 如果没有运行中的工作流，停止轮询
      if (!status.hasRunning) {
        stopPolling()
      }
    }, interval)
  }

  // 停止轮询
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    polling.value = false
  }

  // 增加会话上传计数
  function addSessionUpload(count = 1) {
    sessionUploadCount.value += count
  }

  // 重置会话上传计数
  function resetSessionUpload() {
    sessionUploadCount.value = 0
  }

  // 清理
  function cleanup() {
    stopPolling()
  }

  return {
    // 状态
    loading,
    triggering,
    polling,
    pendingInfo,
    workflowStatus,
    sessionUploadCount,
    lastReleaseStats,
    statsData,
    // 计算属性
    canTrigger,
    statusText,
    // 方法
    refreshPendingInfo,
    refreshLastReleaseStats,
    refreshStatsData,
    refreshWorkflowStatus,
    triggerWorkflow,
    rollbackLastRelease,
    startPolling,
    stopPolling,
    addSessionUpload,
    resetSessionUpload,
    cleanup
  }
})
