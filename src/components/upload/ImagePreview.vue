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
  </div>
</template>

<script setup>
defineProps({
  file: { type: Object, default: null }
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
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.image-preview {
  display: flex;
  flex-direction: column;
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
</style>
