<template>
  <GradientBackground>
    <div class="home">
      <GlassCard ref="cardRef" class="home__card">
        <h1 class="home__title">壁纸上传管理系统</h1>
        <p class="home__desc">基础框架验证页面</p>
        <div class="home__buttons">
          <el-button type="primary">Element Plus 测试</el-button>
          <el-button>默认按钮</el-button>
        </div>
      </GlassCard>
    </div>
  </GradientBackground>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import GradientBackground from '@/components/GradientBackground.vue'
import GlassCard from '@/components/GlassCard.vue'
import { useAnimation } from '@/composables/useAnimation'

const cardRef = ref(null)
const { fadeInUp } = useAnimation()

onMounted(() => {
  if (cardRef.value?.$el) {
    fadeInUp(cardRef.value.$el, { duration: 0.8, y: 40 })
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.home {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: $spacing-4;

  &__card {
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 600;
    margin-bottom: $spacing-3;
    background: $primary-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__desc {
    color: $gray-400;
    margin-bottom: $spacing-6;
  }

  &__buttons {
    display: flex;
    gap: $spacing-3;
    justify-content: center;
  }
}
</style>
