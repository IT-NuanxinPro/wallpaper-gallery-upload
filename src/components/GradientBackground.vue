<template>
  <div class="gradient-bg">
    <!-- 静态渐变背景 -->
    <div class="gradient-bg__layer gradient-bg__layer--1"></div>
    <div class="gradient-bg__layer gradient-bg__layer--2"></div>

    <!-- 内容插槽 -->
    <div class="gradient-bg__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
// 静态渐变背景，无需响应式状态和动画
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
      background-position: 50% 50%;
    }

    &--2 {
      background:
        radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%);
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
  }
}
</style>
