import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/callback',
    name: 'Callback',
    component: () => import('@/views/CallbackView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 需要认证的页面
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 已登录用户访问登录页，重定向到上传页
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Upload' })
    return
  }

  // 已登录但权限未检查，自动检查权限
  if (to.meta.requiresAuth && authStore.isAuthenticated && !authStore.permissionChecked) {
    const configStore = useConfigStore()
    const { owner, repo } = configStore.config
    if (owner && repo) {
      await authStore.checkPermission(owner, repo)
    }
  }

  next()
})

export default router
