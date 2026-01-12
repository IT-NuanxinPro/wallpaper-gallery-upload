<template>
  <MainLayout>
    <div ref="viewRef" class="settings-view">
      <div class="settings-view__container">
        <!-- 左侧：系统设置 -->
        <GlassCard :hoverable="false" class="settings-view__card">
          <div class="settings-view__header">
            <span class="settings-view__icon">⚙️</span>
            <h2 class="settings-view__title">系统设置</h2>
          </div>

          <el-form :model="formData" label-position="top" class="settings-view__form">
            <el-form-item label="仓库所有者">
              <el-input v-model="formData.owner" placeholder="GitHub 用户名或组织名" />
            </el-form-item>

            <el-form-item label="仓库名称">
              <el-input v-model="formData.repo" placeholder="仓库名称" />
            </el-form-item>

            <div class="settings-view__row">
              <el-form-item label="默认分支" class="settings-view__row-item">
                <el-input v-model="formData.branch" placeholder="main" />
              </el-form-item>
              <el-form-item label="Client ID" class="settings-view__row-item">
                <el-input v-model="formData.clientId" placeholder="OAuth Client ID" />
              </el-form-item>
            </div>

            <div class="settings-view__actions">
              <el-button @click="handleReset">重置默认</el-button>
              <el-button type="primary" :loading="validating" @click="handleSave">
                验证并保存
              </el-button>
            </div>
          </el-form>

          <!-- 验证结果 -->
          <Transition name="fade">
            <div v-if="validationResult" class="settings-view__result">
              <el-alert
                :title="validationResult.success ? '配置验证成功' : '配置验证失败'"
                :type="validationResult.success ? 'success' : 'error'"
                :description="validationResult.message"
                show-icon
                :closable="false"
              />
            </div>
          </Transition>
        </GlassCard>

        <!-- 右侧：当前状态 -->
        <GlassCard :hoverable="false" class="settings-view__card settings-view__card--status">
          <div class="settings-view__header">
            <span class="settings-view__icon">📊</span>
            <h2 class="settings-view__title">当前状态</h2>
          </div>

          <div class="settings-view__status">
            <!-- 用户信息 -->
            <div v-if="authStore.isAuthenticated" class="settings-view__user">
              <el-avatar :size="48" :src="authStore.user?.avatar_url" />
              <div class="settings-view__user-info">
                <span class="settings-view__user-name">{{
                  authStore.user?.name || authStore.user?.login
                }}</span>
                <span class="settings-view__user-login">@{{ authStore.user?.login }}</span>
              </div>
            </div>

            <!-- 状态列表 -->
            <div class="settings-view__status-list">
              <div class="settings-view__status-item">
                <span class="settings-view__status-label">登录状态</span>
                <el-tag :type="authStore.isAuthenticated ? 'success' : 'danger'" size="small">
                  {{ authStore.isAuthenticated ? '已登录' : '未登录' }}
                </el-tag>
              </div>

              <div class="settings-view__status-item">
                <span class="settings-view__status-label">权限级别</span>
                <el-tag
                  :type="authStore.permissionChecked ? permissionTagType : 'info'"
                  size="small"
                  class="settings-view__permission-tag"
                >
                  {{ authStore.permissionChecked ? permissionLabel : '检查中...' }}
                </el-tag>
              </div>

              <div class="settings-view__status-item">
                <span class="settings-view__status-label">目标仓库</span>
                <a :href="repoUrl" target="_blank" class="settings-view__repo-link">
                  {{ configStore.config.owner }}/{{ configStore.config.repo }}
                </a>
              </div>
            </div>

            <!-- 快捷操作 -->
            <div class="settings-view__quick-actions">
              <a :href="repoUrl" target="_blank" class="settings-view__quick-btn">
                <span>🔗</span> 访问仓库
              </a>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                class="settings-view__quick-btn"
              >
                <span>🔑</span> 管理 Token
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import MainLayout from '@/components/MainLayout.vue'
import GlassCard from '@/components/GlassCard.vue'
import { useConfigStore } from '@/stores/config'
import { useAuthStore } from '@/stores/auth'
import { useAnimation } from '@/composables/useAnimation'

const configStore = useConfigStore()
const authStore = useAuthStore()
const { fadeInUp } = useAnimation()

const viewRef = ref(null)
const validating = ref(false)
const validationResult = ref(null)

// 表单数据
const formData = reactive({
  owner: configStore.config.owner,
  repo: configStore.config.repo,
  branch: configStore.config.branch,
  clientId: configStore.config.clientId
})

// 权限标签
const permissionLabel = computed(() => {
  const labels = { admin: '管理员', write: '协作者', read: '只读', none: '无权限' }
  return labels[authStore.permissionLevel] || '未知'
})

const permissionTagType = computed(() => {
  const types = { admin: 'success', write: 'primary', read: 'warning', none: 'danger' }
  return types[authStore.permissionLevel] || 'info'
})

const repoUrl = computed(
  () => `https://github.com/${configStore.config.owner}/${configStore.config.repo}`
)

// 保存配置
async function handleSave() {
  if (!configStore.isValidOwnerName(formData.owner)) {
    ElMessage.error('仓库所有者名称格式不正确')
    return
  }
  if (!configStore.isValidRepoName(formData.repo)) {
    ElMessage.error('仓库名称格式不正确')
    return
  }

  validating.value = true
  validationResult.value = null

  try {
    configStore.setConfig({
      owner: formData.owner,
      repo: formData.repo,
      branch: formData.branch,
      clientId: formData.clientId
    })

    const valid = await configStore.validateConfig()
    if (valid) {
      validationResult.value = { success: true, message: '仓库访问正常，配置已保存' }
      ElMessage.success('配置保存成功')
      await authStore.checkPermission(formData.owner, formData.repo)
    } else {
      validationResult.value = {
        success: false,
        message: configStore.validationError || '验证失败'
      }
    }
  } catch (error) {
    validationResult.value = { success: false, message: error.message || '验证失败' }
  } finally {
    validating.value = false
  }
}

// 重置配置
function handleReset() {
  configStore.resetConfig()
  formData.owner = configStore.config.owner
  formData.repo = configStore.config.repo
  formData.branch = configStore.config.branch
  formData.clientId = configStore.config.clientId
  validationResult.value = null
  ElMessage.success('已重置为默认配置')
}

onMounted(async () => {
  if (viewRef.value) fadeInUp(viewRef.value, { duration: 0.5 })
  if (authStore.isAuthenticated && !authStore.permissionChecked) {
    await authStore.checkPermission(configStore.config.owner, configStore.config.repo)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.settings-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: $spacing-6;

  &__container {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: $spacing-5;
    width: 100%;
    max-width: 900px;
    align-items: stretch;
  }

  &__card {
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    margin-bottom: $spacing-5;
    padding-bottom: $spacing-4;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__icon {
    font-size: 24px;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $white;
    margin: 0;
  }

  &__form {
    :deep(.el-form-item) {
      margin-bottom: $spacing-4;
    }

    :deep(.el-form-item__label) {
      color: $gray-300;
      font-size: $font-size-sm;
      padding-bottom: $spacing-1;
    }
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-4;

    &-item {
      margin-bottom: 0;
    }
  }

  &__actions {
    display: flex;
    gap: $spacing-3;
    margin-top: $spacing-5;
    padding-top: $spacing-4;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__result {
    margin-top: $spacing-4;
  }

  // 状态卡片
  &__status {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    padding: $spacing-3;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-lg;
    margin-bottom: $spacing-4;

    &-info {
      display: flex;
      flex-direction: column;
    }

    &-name {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $white;
    }

    &-login {
      font-size: $font-size-xs;
      color: $gray-500;
    }
  }

  &__status-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-3;
    flex: 1;
  }

  &__status-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-2 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:last-child {
      border-bottom: none;
    }
  }

  &__status-label {
    font-size: $font-size-sm;
    color: $gray-400;
  }

  &__permission-tag {
    min-width: 70px;
    text-align: center;
  }

  &__repo-link {
    font-size: $font-size-xs;
    color: $primary-start;
    text-decoration: none;
    font-family: monospace;

    &:hover {
      text-decoration: underline;
    }
  }

  &__quick-actions {
    display: flex;
    gap: $spacing-2;
    margin-top: auto;
    padding-top: $spacing-4;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__quick-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-2;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-md;
    color: $gray-300;
    font-size: $font-size-xs;
    text-decoration: none;
    transition: all $duration-normal;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: $white;
    }
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 响应式
@media (max-width: 768px) {
  .settings-view {
    &__container {
      grid-template-columns: 1fr;
    }
  }
}
</style>
