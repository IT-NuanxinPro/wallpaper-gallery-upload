<template>
  <div class="workflow-trigger">
    <!-- 状态卡片 -->
    <div
      class="workflow-trigger__status"
      :class="`workflow-trigger__status--${workflowStore.statusType}`"
    >
      <div class="workflow-trigger__status-header">
        <el-icon
          class="workflow-trigger__status-icon"
          :class="{ 'is-spinning': workflowStore.isRunning }"
        >
          <Loading v-if="workflowStore.isRunning" />
          <CircleCheck v-else-if="workflowStore.statusType === 'success'" />
          <CircleClose v-else-if="workflowStore.statusType === 'danger'" />
          <Clock v-else />
        </el-icon>
        <span class="workflow-trigger__status-text">{{ workflowStore.statusText }}</span>
      </div>

      <div v-if="workflowStore.latestRun" class="workflow-trigger__status-info">
        <span class="workflow-trigger__status-time">
          {{ workflowStore.formatTime(workflowStore.latestRun.created_at) }}
        </span>
        <a
          v-if="workflowStore.getRunUrl()"
          :href="workflowStore.getRunUrl()"
          target="_blank"
          class="workflow-trigger__status-link"
        >
          查看详情
          <el-icon><Link /></el-icon>
        </a>
      </div>
    </div>

    <!-- 触发按钮 -->
    <el-button
      type="primary"
      :loading="workflowStore.triggering"
      :disabled="workflowStore.isRunning"
      class="workflow-trigger__button"
      @click="handleTrigger"
    >
      <el-icon v-if="!workflowStore.triggering"><Promotion /></el-icon>
      <span>{{ buttonText }}</span>
    </el-button>

    <!-- 运行中提示 -->
    <el-alert
      v-if="workflowStore.isRunning"
      type="info"
      :closable="false"
      class="workflow-trigger__alert"
    >
      <template #title>
        <div class="workflow-trigger__alert-title">
          <el-icon class="is-spinning"><Loading /></el-icon>
          <span>工作流运行中</span>
        </div>
      </template>
      <p>正在处理图片，请稍候...</p>
      <p class="workflow-trigger__alert-hint">页面会自动刷新状态</p>
    </el-alert>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { Loading, CircleCheck, CircleClose, Clock, Link, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWorkflowStore } from '@/stores/workflow'

const workflowStore = useWorkflowStore()

const buttonText = computed(() => {
  if (workflowStore.triggering) return '触发中...'
  if (workflowStore.isRunning) return '运行中...'
  return '触发图片处理'
})

async function handleTrigger() {
  // 二次确认
  try {
    await ElMessageBox.confirm(
      '将触发工作流处理新上传的图片，生成缩略图和预览图，并创建新版本。',
      '确认触发',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return // 用户取消
  }

  try {
    await workflowStore.trigger()
    ElMessage.success('工作流已触发，正在处理中...')
  } catch (error) {
    ElMessage.error(error.message || '触发失败')
  }
}

onMounted(async () => {
  // 初始化时检查状态
  try {
    const result = await workflowStore.checkStatus()
    // 如果有正在运行的工作流，开始轮询
    if (result.hasRunning) {
      workflowStore.startPolling()
    }
  } catch (e) {
    console.error('Failed to check workflow status:', e)
  }
})

onUnmounted(() => {
  workflowStore.stopPolling()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.workflow-trigger {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  &__status {
    padding: $spacing-4;
    border-radius: $radius-xl;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);

    &--success {
      border-color: rgba($success, 0.3);
      background: rgba($success, 0.08);
    }

    &--danger {
      border-color: rgba($danger, 0.3);
      background: rgba($danger, 0.08);
    }

    &--warning {
      border-color: rgba(#f59e0b, 0.3);
      background: rgba(#f59e0b, 0.08);
    }

    &-header {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      margin-bottom: $spacing-2;
    }

    &-icon {
      font-size: 20px;

      &.is-spinning {
        animation: spin 1s linear infinite;
      }
    }

    &-text {
      font-weight: 600;
      color: $gray-200;
    }

    &-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: $font-size-xs;
    }

    &-time {
      color: $gray-500;
    }

    &-link {
      display: flex;
      align-items: center;
      gap: 4px;
      color: $primary-start;
      text-decoration: none;
      transition: all $duration-normal;

      &:hover {
        color: lighten($primary-start, 10%);
      }

      .el-icon {
        font-size: 12px;
      }
    }
  }

  &__button {
    width: 100%;
    height: 44px !important;
    border-radius: $radius-lg !important;
    font-weight: 500 !important;

    &:not(:disabled) {
      background: $primary-gradient !important;
      border: none !important;
      box-shadow: 0 4px 20px rgba($primary-start, 0.3) !important;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba($primary-start, 0.4) !important;
      }
    }
  }

  &__alert {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 1px solid rgba(59, 130, 246, 0.3) !important;
    border-radius: $radius-xl !important;

    &-title {
      display: flex;
      align-items: center;
      gap: $spacing-2;

      .is-spinning {
        animation: spin 1s linear infinite;
      }
    }

    p {
      margin: $spacing-1 0;
      color: $gray-300;
      font-size: $font-size-sm;
    }

    &-hint {
      color: $gray-500 !important;
      font-size: $font-size-xs !important;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
