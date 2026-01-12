<template>
  <MainLayout>
    <div ref="viewRef" class="settings-view">
      <GlassCard :hoverable="false">
        <div class="settings-view__header">
          <h2 class="settings-view__title">系统设置</h2>
        </div>

        <el-form :model="formData" label-width="120px" class="settings-view__form">
          <el-form-item label="仓库所有者">
            <el-input v-model="formData.owner" placeholder="GitHub 用户名或组织名" />
          </el-form-item>

          <el-form-item label="仓库名称">
            <el-input v-model="formData.repo" placeholder="仓库名称" />
          </el-form-item>

          <el-form-item label="默认分支">
            <el-input v-model="formData.branch" placeholder="main" />
          </el-form-item>

          <el-form-item label="Client ID">
            <el-input v-model="formData.clientId" placeholder="GitHub OAuth App Client ID" />
            <div class="settings-view__hint">用于 GitHub OAuth 登录认证</div>
          </el-form-item>

          <el-form-item>
            <div class="settings-view__actions">
              <el-button @click="handleReset">重置默认</el-button>
              <el-button type="primary" :loading="validating" @click="handleSave">
                验证并保存
              </el-button>
            </div>
          </el-form-item>
        </el-form>

        <!-- 验证结果 -->
        <div v-if="validationResult" class="settings-view__result">
          <el-alert
            :title="validationResult.success ? '配置验证成功' : '配置验证失败'"
            :type="validationResult.success ? 'success' : 'error'"
            :description="validationResult.message"
            show-icon
          />
        </div>

        <!-- 当前状态 -->
        <div class="settings-view__status">
          <h3>当前状态</h3>
          <div class="settings-view__status-item">
            <span>登录状态：</span>
            <el-tag :type="authStore.isAuthenticated ? 'success' : 'danger'">
              {{ authStore.isAuthenticated ? '已登录' : '未登录' }}
            </el-tag>
          </div>
          <div v-if="authStore.isAuthenticated" class="settings-view__status-item">
            <span>当前用户：</span>
            <span>{{ authStore.user?.login }}</span>
          </div>
          <div class="settings-view__status-item">
            <span>权限级别：</span>
            <el-tag :type="permissionTagType">
              {{ permissionLabel }}
            </el-tag>
          </div>
        </div>
      </GlassCard>
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

// 保存配置
async function handleSave() {
  // 验证格式
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
    // 保存配置
    configStore.setConfig({
      owner: formData.owner,
      repo: formData.repo,
      branch: formData.branch,
      clientId: formData.clientId
    })

    // 验证仓库访问
    const valid = await configStore.validateConfig()

    if (valid) {
      validationResult.value = {
        success: true,
        message: '仓库访问正常，配置已保存'
      }
      ElMessage.success('配置保存成功')

      // 更新权限
      await authStore.checkPermission(formData.owner, formData.repo)
    } else {
      validationResult.value = {
        success: false,
        message: configStore.validationError || '验证失败'
      }
    }
  } catch (error) {
    validationResult.value = {
      success: false,
      message: error.message || '验证失败'
    }
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

onMounted(() => {
  if (viewRef.value) {
    fadeInUp(viewRef.value, { duration: 0.5 })
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.settings-view {
  max-width: 600px;

  &__header {
    margin-bottom: $spacing-6;
    padding-bottom: $spacing-4;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 600;
    color: $white;
    margin: 0;
  }

  &__form {
    :deep(.el-form-item__label) {
      color: $gray-300;
    }
  }

  &__hint {
    font-size: $font-size-xs;
    color: $gray-500;
    margin-top: $spacing-1;
  }

  &__actions {
    display: flex;
    gap: $spacing-3;
  }

  &__result {
    margin-top: $spacing-6;
  }

  &__status {
    margin-top: $spacing-6;
    padding-top: $spacing-6;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    h3 {
      font-size: $font-size-base;
      color: $gray-300;
      margin-bottom: $spacing-4;
    }

    &-item {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      margin-bottom: $spacing-2;
      color: $gray-400;
      font-size: $font-size-sm;
    }
  }
}
</style>
