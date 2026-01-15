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

  // stats.json 统计数据
  const statsData = ref(null)

  // 工作流运行状态
  const workflowStatus = ref({
    hasRunning: false,
    runningWorkflow: null,
    latestRun: null,
    justTriggered: false,
    triggerTime: null // 触发时间
  })

  // 本次会话上传成功的文件数
  const sessionUploadCount = ref(0)

  // 轮询定时器
  let pollTimer = null
  // 延迟定时器（用于触发后延迟开始轮询、完成后延迟刷新等）
  let delayTimers = []
  // 轮询配置
  let pollConfig = { owner: '', repo: '', imageOwner: '', imageRepo: '', branch: '' }
  // 轮询开始时间
  let pollStartTime = null
  // 最大轮询时间（30分钟）
  const MAX_POLL_TIME = 30 * 60 * 1000

  // 添加延迟定时器（便于统一清理）
  function addDelayTimer(callback, delay) {
    const timer = setTimeout(() => {
      // 执行后从列表中移除
      delayTimers = delayTimers.filter(t => t !== timer)
      callback()
    }, delay)
    delayTimers.push(timer)
    return timer
  }

  // 清理所有延迟定时器
  function clearDelayTimers() {
    delayTimers.forEach(timer => clearTimeout(timer))
    delayTimers = []
  }

  // 计算属性：是否可以触发
  const canTrigger = computed(() => {
    // 正在加载或触发中
    if (loading.value || triggering.value) return false
    // 刚触发或正在运行
    if (workflowStatus.value.justTriggered || workflowStatus.value.hasRunning) return false
    // 没有待处理图片
    if (pendingInfo.value.pendingCount === 0) return false
    return true
  })

  // 计算属性：是否正在运行（包括刚触发）
  const isRunning = computed(() => {
    return workflowStatus.value.justTriggered || workflowStatus.value.hasRunning
  })

  // 计算属性：状态文本
  const statusText = computed(() => {
    if (workflowStatus.value.justTriggered) {
      return '已触发，等待启动...'
    }
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

      // 如果检测到运行中的工作流
      if (status.hasRunning) {
        workflowStatus.value = {
          ...status,
          justTriggered: false, // 已经开始运行，清除刚触发标记
          triggerTime: workflowStatus.value.triggerTime
        }
      } else {
        // 没有运行中的工作流
        const wasRunning = workflowStatus.value.hasRunning || workflowStatus.value.justTriggered

        workflowStatus.value = {
          ...status,
          justTriggered: false,
          triggerTime: null
        }

        // 如果之前在运行，现在完成了，刷新相关数据
        if (wasRunning && pollConfig.imageOwner) {
          // 延迟刷新，等待 GitHub API 同步
          addDelayTimer(async () => {
            await Promise.all([
              refreshPendingInfo(pollConfig.imageOwner, pollConfig.imageRepo, pollConfig.branch),
              refreshStatsData(pollConfig.imageOwner, pollConfig.imageRepo, pollConfig.branch)
            ])
          }, 2000)
        }
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

      // 立即标记为刚触发状态
      workflowStatus.value.justTriggered = true
      workflowStatus.value.triggerTime = Date.now()

      // 触发成功后开始轮询状态
      addDelayTimer(() => {
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

  // 回滚到上一个 tag（触发工作流进行完整回滚）
  async function rollbackLastRelease(
    imageOwner,
    imageRepo,
    workflowOwner,
    workflowRepo,
    tagName = ''
  ) {
    loading.value = true
    try {
      const result = await githubService.rollbackToLastTag(
        imageOwner,
        imageRepo,
        workflowOwner,
        workflowRepo,
        tagName
      )

      // 标记为刚触发状态，开始轮询
      workflowStatus.value.justTriggered = true
      workflowStatus.value.triggerTime = Date.now()

      addDelayTimer(() => {
        startPolling(workflowOwner, workflowRepo)
      }, 3000)

      return result
    } catch (error) {
      console.error('Failed to rollback:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 开始轮询工作流状态
  function startPolling(workflowOwner, workflowRepo, interval = 8000) {
    stopPolling()
    polling.value = true
    pollStartTime = Date.now()

    // 保存配置用于完成后刷新
    pollConfig.owner = workflowOwner
    pollConfig.repo = workflowRepo

    console.log('[WorkflowStore] 开始轮询工作流状态')

    // 立即检查一次
    refreshWorkflowStatus(workflowOwner, workflowRepo)

    pollTimer = setInterval(async () => {
      // 检查是否超过最大轮询时间
      const elapsed = Date.now() - pollStartTime
      if (elapsed > MAX_POLL_TIME) {
        console.warn('[WorkflowStore] 轮询超时（30分钟），自动停止')
        workflowStatus.value.justTriggered = false
        workflowStatus.value.triggerTime = null
        stopPolling()
        return
      }

      const status = await refreshWorkflowStatus(workflowOwner, workflowRepo)

      // 如果没有运行中的工作流且不是刚触发状态，停止轮询
      if (!status.hasRunning && !workflowStatus.value.justTriggered) {
        console.log('[WorkflowStore] 工作流已完成，停止轮询')
        stopPolling()
      }

      // 超时保护：如果触发超过 10 分钟还没检测到运行，停止轮询
      if (workflowStatus.value.justTriggered && workflowStatus.value.triggerTime) {
        const triggerElapsed = Date.now() - workflowStatus.value.triggerTime
        if (triggerElapsed > 10 * 60 * 1000) {
          console.warn('[WorkflowStore] 工作流触发超时（10分钟），停止轮询')
          workflowStatus.value.justTriggered = false
          workflowStatus.value.triggerTime = null
          stopPolling()
        }
      }
    }, interval)
  }

  // 停止轮询
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
      console.log('[WorkflowStore] 停止轮询')
    }
    polling.value = false
    pollStartTime = null
  }

  // 设置图床仓库配置（用于完成后刷新）
  function setImageRepoConfig(owner, repo, branch) {
    pollConfig.imageOwner = owner
    pollConfig.imageRepo = repo
    pollConfig.branch = branch
  }

  // 增加会话上传计数
  function addSessionUpload(count = 1) {
    sessionUploadCount.value += count
  }

  // 重置会话上传计数
  function resetSessionUpload() {
    sessionUploadCount.value = 0
  }

  // 清理所有资源
  function cleanup() {
    console.log('[WorkflowStore] 清理资源')
    stopPolling()
    clearDelayTimers()
    // 重置状态
    workflowStatus.value = {
      hasRunning: false,
      runningWorkflow: null,
      latestRun: null,
      justTriggered: false,
      triggerTime: null
    }
    pollStartTime = null
  }

  return {
    // 状态
    loading,
    triggering,
    polling,
    pendingInfo,
    workflowStatus,
    sessionUploadCount,
    statsData,
    // 计算属性
    canTrigger,
    isRunning,
    statusText,
    // 方法
    refreshPendingInfo,
    refreshStatsData,
    refreshWorkflowStatus,
    triggerWorkflow,
    rollbackLastRelease,
    startPolling,
    stopPolling,
    setImageRepoConfig,
    addSessionUpload,
    resetSessionUpload,
    cleanup
  }
})
