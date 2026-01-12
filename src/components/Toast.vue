<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
        <el-icon class="toast__icon">
          <component :is="getIcon(toast.type)" />
        </el-icon>
        <span class="toast__message">{{ toast.message }}</span>
        <el-icon class="toast__close" @click="removeToast(toast.id)">
          <Close />
        </el-icon>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { CircleCheck, CircleClose, Warning, InfoFilled, Close } from '@element-plus/icons-vue'

const toasts = ref([])
let toastId = 0

function getIcon(type) {
  const icons = {
    success: CircleCheck,
    error: CircleClose,
    warning: Warning,
    info: InfoFilled
  }
  return icons[type] || InfoFilled
}

function addToast(message, type = 'info', duration = 3000) {
  const id = ++toastId
  toasts.value.push({ id, message, type })

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }

  return id
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 暴露方法
defineExpose({
  success: (msg, duration) => addToast(msg, 'success', duration),
  error: (msg, duration) => addToast(msg, 'error', duration),
  warning: (msg, duration) => addToast(msg, 'warning', duration),
  info: (msg, duration) => addToast(msg, 'info', duration),
  remove: removeToast
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.toast-container {
  position: fixed;
  top: $spacing-4;
  right: $spacing-4;
  z-index: $z-toast;
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
}

.toast {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3 $spacing-4;
  background: $glass-bg;
  backdrop-filter: blur($glass-blur);
  border: 1px solid $glass-border;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  min-width: 280px;
  max-width: 400px;

  &--success {
    border-left: 3px solid $success;

    .toast__icon {
      color: $success;
    }
  }

  &--error {
    border-left: 3px solid $danger;

    .toast__icon {
      color: $danger;
    }
  }

  &--warning {
    border-left: 3px solid $warning;

    .toast__icon {
      color: $warning;
    }
  }

  &--info {
    border-left: 3px solid $info;

    .toast__icon {
      color: $info;
    }
  }

  &__message {
    flex: 1;
    color: $gray-200;
    font-size: $font-size-sm;
  }

  &__close {
    color: $gray-500;
    cursor: pointer;
    transition: color $duration-fast;

    &:hover {
      color: $white;
    }
  }
}

// 过渡动画
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
