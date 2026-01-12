<template>
  <Transition name="slide-down">
    <div v-if="visible" class="rate-limit-indicator">
      <div class="rate-limit-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <span class="message">API 请求限制中</span>
        <span class="countdown">{{ countdown }}秒后恢复</span>
        <el-button type="text" size="small" class="dismiss-btn" @click="dismiss"> 关闭 </el-button>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'

const props = defineProps({
  resetTime: {
    type: [Date, Number],
    default: null
  }
})

const emit = defineEmits(['dismiss', 'expired'])

const visible = ref(false)
const countdown = ref(0)
const totalSeconds = ref(0)
let timer = null

const progressPercent = computed(() => {
  if (totalSeconds.value === 0) return 0
  return ((totalSeconds.value - countdown.value) / totalSeconds.value) * 100
})

const startCountdown = () => {
  if (!props.resetTime) return

  const resetMs = props.resetTime instanceof Date ? props.resetTime.getTime() : props.resetTime

  const now = Date.now()
  const remaining = Math.max(0, Math.ceil((resetMs - now) / 1000))

  if (remaining <= 0) {
    visible.value = false
    emit('expired')
    return
  }

  totalSeconds.value = remaining
  countdown.value = remaining
  visible.value = true

  if (timer) clearInterval(timer)

  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
      visible.value = false
      emit('expired')
    }
  }, 1000)
}

const dismiss = () => {
  visible.value = false
  emit('dismiss')
}

watch(
  () => props.resetTime,
  newVal => {
    if (newVal) {
      startCountdown()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style lang="scss" scoped>
.rate-limit-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(234, 88, 12, 0.95));
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.rate-limit-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  color: white;
}

.warning-icon {
  font-size: 20px;
  animation: pulse 1s ease-in-out infinite;
}

.message {
  font-weight: 500;
}

.countdown {
  font-family: 'SF Mono', Monaco, monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.dismiss-btn {
  color: white;
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }
}

.progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.progress-fill {
  height: 100%;
  background: white;
  transition: width 1s linear;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
