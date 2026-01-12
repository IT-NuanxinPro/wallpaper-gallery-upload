<template>
  <div class="skeleton" :style="skeletonStyle">
    <div class="skeleton__inner" :class="{ 'skeleton__inner--animated': animated }"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '20px'
  },
  borderRadius: {
    type: String,
    default: '8px'
  },
  animated: {
    type: Boolean,
    default: true
  }
})

const skeletonStyle = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.borderRadius
}))
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.skeleton {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);

  &__inner {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);

    &--animated {
      animation: pulse 1.5s ease-in-out infinite;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
