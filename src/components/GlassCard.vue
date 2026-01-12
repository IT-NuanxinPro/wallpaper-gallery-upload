<template>
  <div class="glass-card" :class="{ 'glass-card--hoverable': hoverable }" :style="cardStyle">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  hoverable: {
    type: Boolean,
    default: true
  },
  padding: {
    type: String,
    default: '24px'
  },
  blur: {
    type: String,
    default: '20px'
  }
})

const cardStyle = computed(() => ({
  padding: props.padding,
  '--glass-blur': props.blur
}))
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.glass-card {
  background: $glass-bg;
  backdrop-filter: blur(var(--glass-blur, 20px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 20px));
  border-radius: $radius-xl;
  border: 1px solid $glass-border;
  box-shadow: $glass-shadow;
  transition:
    transform $duration-normal $ease-out,
    box-shadow $duration-normal $ease-out;

  // 渐变边框效果
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  &--hoverable:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: $shadow-xl, $shadow-glow;
  }
}
</style>
