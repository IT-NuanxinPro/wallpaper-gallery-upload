<template>
  <div class="gradient-bg">
    <!-- 动态渐变背景 -->
    <div class="gradient-bg__layer gradient-bg__layer--1"></div>
    <div class="gradient-bg__layer gradient-bg__layer--2"></div>

    <!-- 漂浮粒子 -->
    <div ref="particlesRef" class="particles">
      <div v-for="i in particleCount" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>

    <!-- 内容插槽 -->
    <div class="gradient-bg__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

defineProps({
  particleCount: {
    type: Number,
    default: 20
  }
})

const particlesRef = ref(null)

// 生成随机粒子样式
const getParticleStyle = () => {
  const size = Math.random() * 6 + 2
  const left = Math.random() * 100
  const delay = Math.random() * 5
  const duration = Math.random() * 10 + 15

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

onMounted(() => {
  // 背景渐变动画
  gsap.to('.gradient-bg__layer--1', {
    backgroundPosition: '100% 100%',
    duration: 15,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  gsap.to('.gradient-bg__layer--2', {
    backgroundPosition: '0% 0%',
    duration: 20,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.gradient-bg {
  position: fixed;
  inset: 0;
  overflow: hidden;

  &__layer {
    position: absolute;
    inset: 0;

    &--1 {
      background: linear-gradient(
        135deg,
        #1a1a2e 0%,
        #16213e 25%,
        #0f3460 50%,
        #1a1a2e 75%,
        #16213e 100%
      );
      background-size: 400% 400%;
    }

    &--2 {
      background:
        radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%);
      background-size: 200% 200%;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
  }
}

.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  bottom: -10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float-up linear infinite;

  @keyframes float-up {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
    }
    90% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(-100vh) rotate(720deg);
      opacity: 0;
    }
  }
}
</style>
