<template>
  <div class="image-preview">
    <!-- 预览区域 -->
    <div class="image-preview__section">
      <div class="image-preview__header">
        <h3>📷 预览</h3>
      </div>
      <div class="image-preview__main">
        <Transition name="preview" mode="out-in">
          <div v-if="file" :key="file.id" class="image-preview__content">
            <div class="image-preview__img-wrapper">
              <img :src="file.preview" class="image-preview__img" />
            </div>
            <div class="image-preview__info">
              <p class="image-preview__name">{{ file.file.name }}</p>
              <div class="image-preview__meta">
                <span>{{ formatSize(file.file.size) }}</span>
                <span>{{ getFileType(file.file.type) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="image-preview__empty">
            <span class="image-preview__empty-icon">👆</span>
            <p>点击左侧图片预览</p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 工作流触发区域 -->
    <div class="image-preview__workflow">
      <div class="image-preview__header">
        <h3>⚡ 图片处理</h3>
      </div>
      <div class="workflow-card">
        <!-- 状态显示 -->
        <div
          class="workflow-card__status"
          :class="`workflow-card__status--${workflowStore.statusType}`"
        >
          <div class="workflow-card__status-row">
            <el-icon
              class="workflow-card__status-icon"
              :class="{ 'is-spinning': workflowStore.isRunning }"
            >
              <Loading v-if="workflowStore.isRunning" />
              <CircleCheck v-else-if="workflowStore.statusType === 'success'" />
              <CircleClose v-else-if="workflowStore.statusType === 'danger'" />
              <Clock v-else />
            </el-icon>
            <span class="workflow-card__status-text">{{ workflowStore.statusText }}</span>
          </div>
          <div v-if="workflowStore.latestRun" class="workflow-card__status-meta">
            <span>{{ workflowStore.formatTime(workflowStore.latestRun.created_at) }}</span>
            <a
              v-if="workflowStore.getRunUrl()"
              :href="workflowStore.getRunUrl()"
              target="_blank"
              class="workflow-card__link"
            >
              详情 <el-icon><Link /></el-icon>
            </a>
          </div>
        </div>

        <!-- 运行中提示 -->
        <Transition name="fade">
          <div v-if="workflowStore.isRunning" class="workflow-card__running">
            <el-icon class="is-spinning"><Loading /></el-icon>
            <span>正在处理图片...</span>
          </div>
        </Transition>

        <!-- 触发按钮 -->
        <button
          class="workflow-card__trigger"
          :disabled="workflowStore.isRunning || workflowStore.triggering"
          @click="handleTrigger"
        >
          <el-icon v-if="workflowStore.triggering" class="is-spinning"><Loading /></el-icon>
          <el-icon v-else><Promotion /></el-icon>
          <span>{{ triggerButtonText }}</span>
        </button>

        <p class="workflow-card__hint">上传完成后触发，生成缩略图和预览图</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { Loading, CircleCheck, CircleClose, Clock, Link, Promotion } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWorkflowStore } from '@/stores/workflow'

defineProps({
  file: { type: Object, default: null }
})

const workflowStore = useWorkflowStore()

const triggerButtonText = computed(() => {
  if (workflowStore.triggering) return '触发中...'
  if (workflowStore.isRunning) return '运行中...'
  return '触发处理'
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileType(type) {
  const map = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' }
  return map[type] || type.split('/')[1]?.toUpperCase() || '未知'
}

async function handleTrigger() {
  try {
    await ElMessageBox.confirm('将触发工作流处理新上传的图片，生成缩略图和预览图。', '确认触发', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch {
    return
  }

  try {
    await workflowStore.trigger()
    ElMessage.success('工作流已触发')
  } catch (error) {
    ElMessage.error(error.message || '触发失败')
  }
}

onMounted(async () => {
  try {
    const result = await workflowStore.checkStatus()
    if (result.hasRunning) workflowStore.startPolling()
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

.image-preview {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
  height: 100%;
  overflow: hidden;

  &__section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-4;
    min-height: 0;
    overflow: hidden;
  }

  &__workflow {
    flex-shrink: 0;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-4;
  }

  &__header {
    flex-shrink: 0;
    margin-bottom: $spacing-3;
    h3 {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $white;
      margin: 0;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  &__content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  &__img-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    background: rgba(0, 0, 0, 0.2);
    border-radius: $radius-lg;
    overflow: hidden;
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: opacity $duration-normal;
  }

  &__info {
    flex-shrink: 0;
    margin-top: $spacing-3;
    text-align: center;
  }

  &__name {
    font-size: $font-size-sm;
    color: $gray-300;
    margin: 0 0 $spacing-2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    justify-content: center;
    gap: $spacing-2;
    span {
      font-size: $font-size-xs;
      color: $gray-500;
      padding: $spacing-1 $spacing-2;
      background: rgba(255, 255, 255, 0.05);
      border-radius: $radius-sm;
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: $gray-600;
    &-icon {
      font-size: 40px;
      opacity: 0.4;
      margin-bottom: $spacing-3;
    }
    p {
      margin: 0;
      font-size: $font-size-sm;
    }
  }
}

// 工作流卡片
.workflow-card {
  &__status {
    padding: $spacing-3;
    border-radius: $radius-lg;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: $spacing-3;
    transition: all $duration-normal;

    &--success {
      border-color: rgba($success, 0.3);
      background: rgba($success, 0.08);
    }
    &--danger {
      border-color: rgba($danger, 0.3);
      background: rgba($danger, 0.08);
    }
    &--warning {
      border-color: rgba($warning, 0.3);
      background: rgba($warning, 0.08);
    }

    &-row {
      display: flex;
      align-items: center;
      gap: $spacing-2;
    }
    &-icon {
      font-size: 18px;
      &.is-spinning {
        animation: spin 1s linear infinite;
      }
    }
    &-text {
      font-weight: 600;
      font-size: $font-size-sm;
      color: $gray-200;
    }
    &-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: $spacing-2;
      font-size: $font-size-xs;
      color: $gray-500;
    }
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 2px;
    color: $primary-start;
    text-decoration: none;
    font-size: $font-size-xs;
    &:hover {
      text-decoration: underline;
    }
    .el-icon {
      font-size: 10px;
    }
  }

  &__running {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-2;
    background: rgba($info, 0.1);
    border-radius: $radius-md;
    margin-bottom: $spacing-3;
    font-size: $font-size-xs;
    color: $info;
    .is-spinning {
      animation: spin 1s linear infinite;
    }
  }

  &__trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-3;
    background: $primary-gradient;
    border: none;
    border-radius: $radius-lg;
    color: $white;
    font-size: $font-size-sm;
    font-weight: 600;
    cursor: pointer;
    transition: all $duration-normal $ease-out;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba($primary-start, 0.4);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .is-spinning {
      animation: spin 1s linear infinite;
    }
  }

  &__hint {
    margin: $spacing-2 0 0;
    font-size: $font-size-xs;
    color: $gray-600;
    text-align: center;
  }
}

// 过渡动画
.preview-enter-active,
.preview-leave-active {
  transition: all $duration-normal $ease-out;
}
.preview-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.preview-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
