<template>
  <MainLayout>
    <div ref="viewRef" class="history-view">
      <GlassCard :hoverable="false">
        <div class="history-view__header">
          <h2 class="history-view__title">上传历史</h2>
          <div class="history-view__stats">
            <span class="history-view__stat history-view__stat--success">
              <el-icon><CircleCheck /></el-icon>
              {{ historyStore.successCount }} 成功
            </span>
            <span class="history-view__stat history-view__stat--error">
              <el-icon><CircleClose /></el-icon>
              {{ historyStore.errorCount }} 失败
            </span>
          </div>
          <el-button
            v-if="historyStore.records.length > 0"
            type="danger"
            plain
            size="small"
            @click="handleClearHistory"
          >
            清空历史
          </el-button>
        </div>

        <!-- 空状态 -->
        <div v-if="historyStore.records.length === 0" class="history-view__empty">
          <el-empty description="暂无上传记录" />
        </div>

        <!-- 历史列表 -->
        <div v-else class="history-view__list">
          <div v-for="(records, date) in groupedRecords" :key="date" class="history-view__group">
            <div class="history-view__date">{{ date }}</div>
            <div class="history-view__items">
              <div
                v-for="record in records"
                :key="record.id"
                class="history-view__item"
                :class="`history-view__item--${record.status}`"
                @click="showPreview(record)"
              >
                <div class="history-view__item-icon">
                  <el-icon v-if="record.status === 'success'" class="history-view__icon--success">
                    <CircleCheck />
                  </el-icon>
                  <el-icon v-else class="history-view__icon--error">
                    <CircleClose />
                  </el-icon>
                </div>
                <div class="history-view__item-info">
                  <span class="history-view__item-name">{{ record.filename }}</span>
                  <span class="history-view__item-category">{{ record.category }}</span>
                </div>
                <div class="history-view__item-time">
                  {{ formatTime(record.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <!-- 预览弹窗 -->
      <el-dialog v-model="previewVisible" :title="previewRecord?.filename" width="600px">
        <div class="history-view__preview">
          <p><strong>分类：</strong>{{ previewRecord?.category }}</p>
          <p><strong>系列：</strong>{{ previewRecord?.series }}</p>
          <p><strong>状态：</strong>{{ previewRecord?.status === 'success' ? '成功' : '失败' }}</p>
          <p>
            <strong>时间：</strong
            >{{ previewRecord ? formatDateTime(previewRecord.timestamp) : '' }}
          </p>
        </div>
      </el-dialog>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import MainLayout from '@/components/MainLayout.vue'
import GlassCard from '@/components/GlassCard.vue'
import { useHistoryStore } from '@/stores/history'
import { useAnimation } from '@/composables/useAnimation'

const historyStore = useHistoryStore()
const { fadeInUp } = useAnimation()

const viewRef = ref(null)
const previewVisible = ref(false)
const previewRecord = ref(null)

// 按日期分组
const groupedRecords = computed(() => historyStore.getRecordsByDate())

// 显示预览
function showPreview(record) {
  previewRecord.value = record
  previewVisible.value = true
}

// 清空历史
async function handleClearHistory() {
  try {
    await ElMessageBox.confirm('确定要清空所有上传历史吗？此操作不可恢复。', '清空确认', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    historyStore.clearHistory()
    ElMessage.success('历史记录已清空')
  } catch {
    // 取消
  }
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  if (viewRef.value) {
    fadeInUp(viewRef.value, { duration: 0.5 })
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.history-view {
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    margin-bottom: $spacing-6;
    padding-bottom: $spacing-4;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 600;
    color: $white;
    margin: 0;
    flex: 1;
  }

  &__stats {
    display: flex;
    gap: $spacing-4;
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: $spacing-1;
    font-size: $font-size-sm;

    &--success {
      color: $success;
    }

    &--error {
      color: $danger;
    }
  }

  &__empty {
    padding: $spacing-8;
  }

  &__group {
    margin-bottom: $spacing-6;
  }

  &__date {
    color: $gray-400;
    font-size: $font-size-sm;
    margin-bottom: $spacing-3;
    padding-left: $spacing-2;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-md;
    cursor: pointer;
    transition: background $duration-normal;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &--success {
      border-left: 3px solid $success;
    }

    &--error {
      border-left: 3px solid $danger;
    }

    &-icon {
      flex-shrink: 0;
    }

    &-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &-name {
      color: $gray-200;
      font-size: $font-size-sm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &-category {
      color: $gray-500;
      font-size: $font-size-xs;
    }

    &-time {
      color: $gray-500;
      font-size: $font-size-xs;
      flex-shrink: 0;
    }
  }

  &__icon {
    &--success {
      color: $success;
    }

    &--error {
      color: $danger;
    }
  }

  &__preview {
    p {
      margin-bottom: $spacing-2;
      color: $gray-700;
    }
  }
}
</style>
