<template>
  <el-dialog
    v-model="visible"
    title="登录已过期"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="token-expired-dialog"
  >
    <div class="dialog-content">
      <div class="icon-wrapper">
        <el-icon class="expired-icon"><Lock /></el-icon>
      </div>
      <p class="message">您的登录状态已过期，请重新登录以继续使用。</p>
    </div>

    <template #footer>
      <el-button type="primary" :loading="loading" @click="handleRelogin"> 重新登录 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const authStore = useAuthStore()

const visible = ref(props.modelValue)
const loading = ref(false)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleRelogin = async () => {
  loading.value = true

  // 清除认证状态
  await authStore.logout()

  // 关闭弹窗
  visible.value = false

  // 跳转到登录页
  router.push('/login')

  loading.value = false
}
</script>

<style lang="scss" scoped>
.token-expired-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    color: white;
    padding: 20px;
    margin: 0;

    .el-dialog__title {
      color: white;
      font-weight: 600;
    }
  }

  :deep(.el-dialog__body) {
    padding: 30px;
  }
}

.dialog-content {
  text-align: center;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expired-icon {
  font-size: 40px;
  color: #8b5cf6;
}

.message {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}
</style>
