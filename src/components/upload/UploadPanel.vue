<template>
  <div class="upload-panel">
    <!-- 顶部：路径 + 操作按钮 -->
    <div class="upload-panel__header">
      <div class="upload-panel__path" :class="{ 'upload-panel__path--empty': !targetPath }">
        <el-icon v-if="targetPath"><FolderOpened /></el-icon>
        <el-icon v-else><Warning /></el-icon>
        <span>{{ targetPath || '请先选择分类' }}</span>
      </div>
      <div class="upload-panel__actions">
        <Transition name="fade">
          <div v-if="files.length > 0" class="upload-panel__stats">
            <span class="upload-panel__count">
              <el-icon><Picture /></el-icon>
              {{ files.length }}
            </span>
            <Transition name="fade">
              <span v-if="errorCount > 0" class="upload-panel__error" @click="$emit('retry')">
                {{ errorCount }} 失败
              </span>
            </Transition>
            <button v-if="!uploading" class="upload-panel__btn-clear" @click="handleClear">
              <el-icon><Delete /></el-icon>
            </button>
          </div>
        </Transition>
        <button
          v-if="authStore.canUpload"
          class="upload-panel__btn-upload"
          :disabled="pendingCount === 0 || uploading || hasFilesWithoutTarget"
          @click="$emit('upload')"
        >
          <el-icon v-if="uploading" class="is-loading"><Loading /></el-icon>
          <el-icon v-else><Upload /></el-icon>
          <span v-if="uploading">{{ progress }}%</span>
          <span v-else>上传</span>
        </button>
      </div>
    </div>

    <!-- 主内容区：撑满 -->
    <div class="upload-panel__main">
      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        class="upload-panel__input"
        @change="handleFileSelect"
      />
      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        class="upload-panel__input"
        @change="handleFolderSelect"
      />

      <!-- 拖拽区域 -->
      <div
        class="upload-panel__dropzone"
        :class="{
          'upload-panel__dropzone--active': isDragging,
          'upload-panel__dropzone--disabled': !targetPath || uploading,
          'upload-panel__dropzone--compact': files.length > 0
        }"
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div class="upload-panel__dropzone-content">
          <span class="upload-panel__dropzone-icon">{{ targetPath ? '📁' : '🔒' }}</span>
          <span class="upload-panel__dropzone-text">
            {{ targetPath ? '拖拽图片或文件夹到此处' : '请先选择分类' }}
          </span>
          <div v-if="targetPath && !uploading" class="upload-panel__dropzone-btns">
            <button class="upload-panel__add-btn" @click="triggerInput">🖼️ 选择图片</button>
            <button class="upload-panel__add-btn" @click="triggerFolderInput">📂 选择文件夹</button>
          </div>
        </div>
      </div>

      <!-- 文件网格 -->
      <div v-if="files.length > 0" class="upload-panel__files">
        <!-- 批量操作栏 -->
        <div v-if="!uploading" class="upload-panel__batch">
          <el-checkbox
            v-model="selectAll"
            :indeterminate="isIndeterminate"
            :disabled="pendingFiles.length === 0"
            @change="handleSelectAll"
          >
            全选（用于批量删除）
          </el-checkbox>
          <Transition name="fade">
            <button
              v-if="selectedIds.length > 0"
              class="upload-panel__batch-delete"
              @click="handleBatchDelete"
            >
              <el-icon><Delete /></el-icon>
              删除选中 ({{ selectedIds.length }})
            </button>
          </Transition>
        </div>
        <TransitionGroup name="grid" tag="div" class="upload-panel__grid">
          <div
            v-for="file in files"
            :key="file.id"
            class="upload-panel__item"
            :class="[
              `upload-panel__item--${file.status}`,
              { 'upload-panel__item--selected': selectedId === file.id },
              { 'upload-panel__item--checked': selectedIds.includes(file.id) }
            ]"
            @click="$emit('select', file)"
          >
            <!-- 复选框 -->
            <el-checkbox
              v-if="(file.status === 'pending' || file.status === 'error') && !uploading"
              v-model="selectedIds"
              :value="file.id"
              class="upload-panel__item-checkbox"
              @click.stop
            />
            <img :src="file.preview" class="upload-panel__item-img" draggable="false" />
            <div v-if="file.status === 'uploading'" class="upload-panel__item-overlay">
              <el-progress
                type="circle"
                :percentage="file.progress"
                :width="36"
                :stroke-width="3"
              />
            </div>
            <span
              v-else-if="file.status === 'success'"
              class="upload-panel__item-badge upload-panel__item-badge--success"
              >✓</span
            >
            <span
              v-else-if="file.status === 'error'"
              class="upload-panel__item-badge upload-panel__item-badge--error"
              >!</span
            >
            <button
              v-if="file.status === 'pending' || file.status === 'error'"
              class="upload-panel__item-remove"
              @click.stop="$emit('remove', file.id)"
            >
              ×
            </button>
            <!-- 目标路径标签 -->
            <div
              v-if="file.status === 'pending' && file.targetPath"
              class="upload-panel__item-path"
              :class="`upload-panel__item-path--${file.targetSeries}`"
              :title="file.targetPath"
              @click.stop="$emit('change-target', file)"
            >
              <span class="upload-panel__item-path-icon">{{
                getSeriesIcon(file.targetSeries)
              }}</span>
              <span class="upload-panel__item-path-text">{{ getShortPath(file.targetPath) }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- 空状态 -->
      <div v-else class="upload-panel__empty">
        <span class="upload-panel__empty-icon">🖼️</span>
        <p>暂无待上传文件</p>
        <p class="upload-panel__empty-hint">支持 JPG、PNG、WebP，单个最大 25MB</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { FolderOpened, Warning, Picture, Delete, Upload, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const props = defineProps({
  targetPath: { type: String, default: '' },
  files: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  uploading: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 }
})

const emit = defineEmits([
  'add-files',
  'remove',
  'remove-batch',
  'clear',
  'retry',
  'upload',
  'select',
  'change-target'
])

const fileInputRef = ref(null)
const folderInputRef = ref(null)
const isDragging = ref(false)
const selectedIds = ref([])

// 全选相关
const pendingFiles = computed(() =>
  props.files.filter(f => f.status === 'pending' || f.status === 'error')
)
const hasFilesWithoutTarget = computed(() => pendingFiles.value.some(f => !f.targetPath))
const selectAll = computed({
  get: () =>
    pendingFiles.value.length > 0 && selectedIds.value.length === pendingFiles.value.length,
  set: () => {}
})
const isIndeterminate = computed(
  () => selectedIds.value.length > 0 && selectedIds.value.length < pendingFiles.value.length
)

// 文件列表变化时清理已删除的选中项
watch(
  () => props.files,
  files => {
    const ids = files.map(f => f.id)
    selectedIds.value = selectedIds.value.filter(id => ids.includes(id))
  },
  { deep: true }
)

// 全局阻止拖拽默认行为（防止在新标签页打开图片）
function preventDefaultDrag(e) {
  e.preventDefault()
}

onMounted(() => {
  document.addEventListener('dragover', preventDefaultDrag)
  document.addEventListener('drop', preventDefaultDrag)
})

onUnmounted(() => {
  document.removeEventListener('dragover', preventDefaultDrag)
  document.removeEventListener('drop', preventDefaultDrag)
})

function triggerInput() {
  if (!props.targetPath) {
    ElMessage.warning('请先选择上传分类')
    return
  }
  if (!props.uploading) fileInputRef.value?.click()
}

function triggerFolderInput() {
  if (!props.targetPath) {
    ElMessage.warning('请先选择上传分类')
    return
  }
  if (!props.uploading) folderInputRef.value?.click()
}

// 递归读取文件夹中的文件
async function readEntriesRecursively(entry) {
  const files = []

  if (entry.isFile) {
    const file = await new Promise(resolve => entry.file(resolve))
    if (file.type.startsWith('image/')) {
      files.push(file)
    }
  } else if (entry.isDirectory) {
    const reader = entry.createReader()
    const entries = await new Promise(resolve => reader.readEntries(resolve))
    for (const subEntry of entries) {
      const subFiles = await readEntriesRecursively(subEntry)
      files.push(...subFiles)
    }
  }

  return files
}

// 处理拖拽（支持文件夹）
async function handleDrop(e) {
  isDragging.value = false
  if (!props.targetPath) {
    ElMessage.warning('请先选择上传分类')
    return
  }
  if (props.uploading) return

  const items = e.dataTransfer.items
  const allFiles = []

  // 检查是否有文件夹
  const entries = []
  for (const item of items) {
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry()
      if (entry) entries.push(entry)
    }
  }

  if (entries.length > 0) {
    // 使用 Entry API 递归读取
    for (const entry of entries) {
      const files = await readEntriesRecursively(entry)
      allFiles.push(...files)
    }
  } else {
    // 降级：直接使用 files
    allFiles.push(...Array.from(e.dataTransfer.files))
  }

  if (allFiles.length > 0) {
    emit('add-files', allFiles)
  }
}

function handleFileSelect(e) {
  emit('add-files', Array.from(e.target.files))
  e.target.value = ''
}

function handleFolderSelect(e) {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
  if (files.length > 0) {
    emit('add-files', files)
  } else {
    ElMessage.warning('文件夹中没有找到图片文件')
  }
  e.target.value = ''
}

// 全选/取消全选
function handleSelectAll(val) {
  if (val) {
    selectedIds.value = pendingFiles.value.map(f => f.id)
  } else {
    selectedIds.value = []
  }
}

// 批量删除
async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个文件吗？`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    emit('remove-batch', [...selectedIds.value])
    selectedIds.value = []
  } catch {
    // 取消
  }
}

// 全部删除确认
async function handleClear() {
  try {
    await ElMessageBox.confirm(`确定要删除全部 ${props.files.length} 个文件吗？`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('clear')
    selectedIds.value = []
  } catch {
    // 取消
  }
}

// 获取简短路径显示
function getShortPath(path) {
  if (!path) return ''
  // wallpaper/avatar/人像/卡通简笔画 -> 卡通简笔画
  const parts = path.split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || path
}

// 获取系列图标
function getSeriesIcon(series) {
  const icons = {
    desktop: '🖥️',
    mobile: '📱',
    avatar: '👤'
  }
  return icons[series] || '📁'
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.upload-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-height: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-3;
    margin-bottom: $spacing-4;
    flex-shrink: 0;
  }

  &__path {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: rgba($success, 0.1);
    border: 1px solid rgba($success, 0.3);
    border-radius: $radius-lg;
    font-size: $font-size-sm;
    color: $white;
    transition: all $duration-normal;
    min-width: 0;

    .el-icon {
      font-size: 18px;
      color: $success;
      flex-shrink: 0;
    }

    span {
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &--empty {
      background: rgba($warning, 0.1);
      border-color: rgba($warning, 0.3);

      .el-icon {
        color: $warning;
      }
      span {
        color: $warning;
        font-family: inherit;
      }
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    flex-shrink: 0;
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__count {
    display: flex;
    align-items: center;
    gap: $spacing-1;
    font-size: $font-size-sm;
    color: $gray-300;
    padding: $spacing-2 $spacing-3;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-md;

    .el-icon {
      font-size: 14px;
      color: $primary-start;
    }
  }

  &__error {
    font-size: $font-size-xs;
    color: $danger;
    padding: $spacing-1 $spacing-2;
    background: rgba($danger, 0.1);
    border-radius: $radius-sm;
    cursor: pointer;

    &:hover {
      background: rgba($danger, 0.2);
    }
  }

  &__btn-clear {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: $radius-md;
    color: $gray-400;
    cursor: pointer;
    transition: all $duration-normal;

    &:hover {
      background: rgba($danger, 0.1);
      color: $danger;
    }
  }

  &__btn-upload {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-2 $spacing-5;
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

    .is-loading {
      animation: spin 1s linear infinite;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-4;
    overflow: hidden;
    min-height: 0;
    height: 100%;
  }

  &__dropzone {
    padding: $spacing-6 $spacing-4;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: $radius-lg;
    transition: all $duration-normal;
    flex-shrink: 0;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(&--disabled) {
      border-color: rgba($primary-start, 0.5);
      background: rgba($primary-start, 0.05);
    }

    &--active {
      border-color: $primary-start;
      background: rgba($primary-start, 0.1);
    }

    &--disabled {
      opacity: 0.5;
    }

    &--compact {
      padding: $spacing-3 $spacing-4;
      min-height: 80px;
    }

    &-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: $spacing-3;
      flex-wrap: wrap;
    }

    &-icon {
      font-size: 18px;
    }

    &-text {
      color: $gray-300;
      font-size: $font-size-sm;
    }
  }

  &__dropzone-btns {
    display: flex;
    gap: $spacing-2;
  }

  &__add-btn {
    padding: $spacing-2 $spacing-4;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: $radius-md;
    color: $gray-300;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all $duration-normal;

    &:hover {
      background: rgba($primary-start, 0.15);
      border-color: rgba($primary-start, 0.4);
      color: $white;
    }
  }

  &__input {
    display: none;
  }

  &__files {
    flex: 1;
    overflow-y: auto;
    margin-top: $spacing-3;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }
  }

  &__batch {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin-bottom: $spacing-3;
    padding-bottom: $spacing-2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    :deep(.el-checkbox__label) {
      color: $gray-400;
      font-size: $font-size-sm;
    }

    &-delete {
      display: flex;
      align-items: center;
      gap: $spacing-1;
      padding: $spacing-1 $spacing-3;
      background: rgba($danger, 0.1);
      border: 1px solid rgba($danger, 0.3);
      border-radius: $radius-md;
      color: $danger;
      font-size: $font-size-xs;
      cursor: pointer;
      transition: all $duration-normal;

      &:hover {
        background: rgba($danger, 0.2);
      }

      .el-icon {
        font-size: 12px;
      }
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: $spacing-3;
    align-content: start;
  }

  &__item {
    position: relative;
    aspect-ratio: 1;
    border-radius: $radius-lg;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all $duration-normal;

    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.03);
    }

    &--selected {
      border-color: $primary-start;
      box-shadow: 0 0 0 2px rgba($primary-start, 0.3);
    }

    &--checked {
      border-color: rgba($primary-start, 0.5);

      .upload-panel__item-checkbox {
        opacity: 1;
      }
    }

    &--success {
      border-color: $success;
    }
    &--error {
      border-color: $danger;
    }

    &-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }

    &-checkbox {
      position: absolute;
      top: 4px;
      left: 4px;
      z-index: 2;
      opacity: 0;
      transition: opacity $duration-normal;

      .upload-panel__item:hover & {
        opacity: 1;
      }

      :deep(.el-checkbox__inner) {
        background: rgba(0, 0, 0, 0.6);
        border-color: rgba(255, 255, 255, 0.5);
      }

      :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
        background: $primary-start;
        border-color: $primary-start;
      }
    }

    &-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
    }

    &-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 11px;
      font-weight: bold;

      &--success {
        background: $success;
        color: $white;
      }
      &--error {
        background: $danger;
        color: $white;
      }
    }

    &-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      border-radius: 50%;
      color: $white;
      font-size: 14px;
      cursor: pointer;
      opacity: 0;
      transition: all $duration-normal;

      .upload-panel__item:hover & {
        opacity: 1;
      }
      &:hover {
        background: $danger;
      }
    }

    &-path {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.75);
      color: $gray-300;
      font-size: 10px;
      text-align: center;
      cursor: pointer;
      transition: all $duration-normal;

      &:hover {
        background: rgba($primary-start, 0.8);
        color: $white;
      }

      &-icon {
        font-size: 9px;
      }

      &-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      // 不同系列不同颜色
      &--desktop {
        border-top: 2px solid $primary-start;
      }

      &--mobile {
        border-top: 2px solid $success;
      }

      &--avatar {
        border-top: 2px solid $warning;
      }
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: $gray-500;
    min-height: 0;

    &-icon {
      font-size: 48px;
      opacity: 0.3;
      margin-bottom: $spacing-3;
    }

    p {
      margin: 0;
      font-size: $font-size-sm;
    }

    &-hint {
      margin-top: $spacing-2 !important;
      font-size: $font-size-xs !important;
      color: $gray-600;
    }
  }
}

// 过渡动画
.grid-enter-active,
.grid-leave-active {
  transition: all $duration-normal $ease-out;
}

.grid-enter-from,
.grid-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.grid-move {
  transition: transform $duration-normal $ease-out;
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
