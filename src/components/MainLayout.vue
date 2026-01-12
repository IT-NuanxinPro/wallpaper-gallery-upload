<template>
  <GradientBackground :particle-count="15">
    <div class="layout">
      <!-- 顶部导航 -->
      <header class="layout__header">
        <GlassCard class="layout__nav" :hoverable="false" padding="12px 24px">
          <div class="layout__nav-left">
            <router-link to="/upload" class="layout__logo">
              <el-icon :size="24"><Picture /></el-icon>
              <span>壁纸管理</span>
            </router-link>
          </div>

          <nav class="layout__nav-center">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="layout__nav-item"
              :class="{ 'layout__nav-item--active': isActive(item.path) }"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </router-link>
          </nav>

          <div class="layout__nav-right">
            <el-dropdown trigger="click" @command="handleCommand">
              <div class="layout__user">
                <el-avatar :size="32" :src="authStore.user?.avatar_url" />
                <span class="layout__user-name">{{ authStore.user?.login }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="settings">
                    <el-icon><Setting /></el-icon>
                    设置
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </GlassCard>
      </header>

      <!-- 主内容区 -->
      <main class="layout__main">
        <slot />
      </main>
    </div>
  </GradientBackground>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { Picture, Upload, Clock, Setting, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import GradientBackground from '@/components/GradientBackground.vue'
import GlassCard from '@/components/GlassCard.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navItems = [
  { path: '/upload', label: '上传', icon: Upload },
  { path: '/history', label: '历史', icon: Clock },
  { path: '/settings', label: '设置', icon: Setting }
]

function isActive(path) {
  return route.path === path
}

async function handleCommand(command) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      authStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    } catch {
      // 取消
    }
  } else if (command === 'settings') {
    router.push('/settings')
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: $spacing-4;
  }

  &__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &-left,
    &-right {
      flex: 1;
    }

    &-right {
      display: flex;
      justify-content: flex-end;
    }

    &-center {
      display: flex;
      gap: $spacing-2;
    }

    &-item {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      padding: $spacing-2 $spacing-4;
      border-radius: $radius-md;
      color: $gray-400;
      text-decoration: none;
      transition: all $duration-normal $ease-out;

      &:hover {
        color: $white;
        background: rgba(255, 255, 255, 0.1);
      }

      &--active {
        color: $white;
        background: $primary-gradient;
      }
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    color: $white;
    text-decoration: none;
    font-weight: 600;
    font-size: $font-size-lg;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    cursor: pointer;
    padding: $spacing-1 $spacing-2;
    border-radius: $radius-md;
    transition: background $duration-normal;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &-name {
      color: $gray-300;
      font-size: $font-size-sm;
    }
  }

  &__main {
    flex: 1;
    padding: 0 $spacing-4 $spacing-4;
  }
}
</style>
