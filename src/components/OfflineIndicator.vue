<template>
  <Transition name="slide">
    <div v-if="!isOnline" class="offline-indicator">
      <el-icon><WifiOff /></el-icon>
      <span>网络连接已断开</span>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { WifiOff } from '@element-plus/icons-vue'

const isOnline = ref(navigator.onLine)

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.offline-indicator {
  position: fixed;
  bottom: $spacing-4;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: $danger;
  color: $white;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  box-shadow: $shadow-lg;
  z-index: $z-toast;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
