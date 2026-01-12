<template>
  <GradientBackground>
    <div class="login">
      <GlassCard ref="cardRef" class="login__card" :hoverable="false" padding="40px">
        <!-- Logo -->
        <div class="login__logo">
          <div class="login__logo-icon">
            <el-icon :size="48"><Picture /></el-icon>
          </div>
          <h1 class="login__title">壁纸上传管理</h1>
          <p class="login__subtitle">Wallpaper Upload Admin</p>
        </div>

        <!-- 已登录状态 -->
        <div v-if="authStore.isAuthenticated" class="login__user">
          <el-avatar :size="64" :src="authStore.user?.avatar_url" />
          <div class="login__user-info">
            <span class="login__user-name">{{
              authStore.user?.name || authStore.user?.login
            }}</span>
            <el-tag :type="permissionTagType" size="small" effect="dark">
              {{ permissionLabel }}
            </el-tag>
          </div>
          <div class="login__actions">
            <el-button type="primary" @click="goToUpload">进入系统</el-button>
            <el-button @click="handleLogout">退出登录</el-button>
          </div>
        </div>

        <!-- 未登录状态 -->
        <div v-else class="login__form">
          <!-- GitHub OAuth 登录按钮 -->
          <button class="login__github-btn" @click="handleGitHubLogin" :disabled="loading">
            <svg class="login__github-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>{{ loading ? '登录中...' : '使用 GitHub 登录' }}</span>
          </button>

          <div class="login__divider">
            <span>或</span>
          </div>

          <!-- Token 登录 -->
          <div class="login__token-section">
            <button 
              class="login__token-toggle" 
              @click="showTokenInput = !showTokenInput"
            >
              {{ showTokenInput ? '收起' : '使用 Token 登录' }}
            </button>
            
            <Transition name="slide">
              <div v-if="showTokenInput" class="login__token-form">
                <el-input
                  v-model="tokenInput"
                  type="password"
                  placeholder="请输入 GitHub Personal Access Token"
                  size="large"
                  show-password
                  class="login__input"
                >
                  <template #prefix>
                    <el-icon><Key /></el-icon>
                  </template>
                </el-input>

                <el-button
                  type="primary"
                  size="large"
                  :loading="tokenLoading"
                  :disabled="!tokenInput.trim()"
                  class="login__btn"
                  @click="handleTokenLogin"
                >
                  {{ tokenLoading ? '验证中...' : '登录' }}
                </el-button>

                <el-link
                  type="primary"
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Wallpaper%20Upload%20Admin"
                  target="_blank"
                  :underline="false"
                  class="login__create-token"
                >
                  创建 Token →
                </el-link>
              </div>
            </Transition>
          </div>

          <p class="login__hint">需要仓库协作者权限才能上传</p>
        </div>
      </GlassCard>
    </div>
  </GradientBackground>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, Key } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import GradientBackground from '@/components/GradientBackground.vue'
import GlassCard from '@/components/GlassCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useAnimation } from '@/composables/useAnimation'
import { githubService } from '@/services/github'
import { getAuthUrl } from '@/config/oauth'

const router = useRouter()
const authStore = useAuthStore()
const configStore = useConfigStore()
const { fadeInScale } = useAnimation()

const cardRef = ref(null)
const loading = ref(false)
const tokenLoading = ref(false)
const tokenInput = ref('')
const showTokenInput = ref(false)

// 权限标签
const permissionLabel = computed(() => {
  const labels = {
    admin: '管理员',
    write: '协作者',
    read: '只读',
    none: '无权限'
  }
  return labels[authStore.permissionLevel] || '未知'
})

const permissionTagType = computed(() => {
  const types = {
    admin: 'success',
    write: 'primary',
    read: 'warning',
    none: 'danger'
  }
  return types[authStore.permissionLevel] || 'info'
})

// GitHub OAuth 登录
function handleGitHubLogin() {
  loading.value = true
  window.location.href = getAuthUrl()
}

// Token 登录
async function handleTokenLogin() {
  const token = tokenInput.value.trim()
  if (!token) return

  tokenLoading.value = true
  try {
    githubService.setToken(token)
    const userData = await githubService.getCurrentUser()

    authStore.setToken(token)
    authStore.setUser(userData)

    const { owner, repo } = configStore.config
    await authStore.checkPermission(owner, repo)

    ElMessage.success(`欢迎，${userData.name || userData.login}！`)
    tokenInput.value = ''
  } catch (error) {
    console.error('Token login failed:', error)
    ElMessage.error('Token 无效或已过期，请检查后重试')
    githubService.setToken(null)
  } finally {
    tokenLoading.value = false
  }
}

// 退出登录
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    authStore.logout()
    ElMessage.success('已退出登录')
  } catch {
    // 取消
  }
}

// 进入系统
function goToUpload() {
  router.push('/upload')
}

// 入场动画
onMounted(async () => {
  if (cardRef.value?.$el) {
    fadeInScale(cardRef.value.$el, { duration: 0.6, scale: 0.95 })
  }

  if (authStore.token) {
    const valid = await authStore.validateToken()
    if (valid) {
      const { owner, repo } = configStore.config
      await authStore.checkPermission(owner, repo)
    }
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $spacing-4;

  &__card {
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  &__logo {
    margin-bottom: $spacing-8;

    &-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto $spacing-4;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $primary-gradient;
      border-radius: $radius-xl;
      color: $white;
    }
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 600;
    margin-bottom: $spacing-2;
    background: $primary-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__subtitle {
    color: $gray-400;
    font-size: $font-size-sm;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  // GitHub 登录按钮
  &__github-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-3;
    width: 100%;
    height: 52px;
    background: #24292e;
    border: none;
    border-radius: $radius-lg;
    color: $white;
    font-size: $font-size-base;
    font-weight: 500;
    cursor: pointer;
    transition: all $duration-normal $ease-out;

    &:hover:not(:disabled) {
      background: #2f363d;
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  &__github-icon {
    width: 24px;
    height: 24px;
  }

  // 分隔线
  &__divider {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    color: $gray-500;
    font-size: $font-size-xs;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }
  }

  // Token 登录区域
  &__token-section {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__token-toggle {
    background: none;
    border: none;
    color: $gray-400;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: color $duration-normal;

    &:hover {
      color: $primary-start;
    }
  }

  &__token-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
  }

  &__create-token {
    font-size: $font-size-xs;
  }

  &__input {
    :deep(.el-input__wrapper) {
      border-radius: $radius-lg;
    }
  }

  &__btn {
    height: 48px;
    font-size: $font-size-base;
  }

  &__hint {
    color: $gray-500;
    font-size: $font-size-xs;
    margin: 0;
  }

  &__user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-4;

    &-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-2;
    }

    &-name {
      font-size: $font-size-lg;
      font-weight: 500;
    }
  }

  &__actions {
    display: flex;
    gap: $spacing-3;
    margin-top: $spacing-4;
  }
}

// 滑动动画
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
