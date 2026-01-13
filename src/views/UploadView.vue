<template>
  <MainLayout>
    <div ref="viewRef" class="upload-view">
      <!-- 只读提示 -->
      <el-alert
        v-if="authStore.permissionChecked && !authStore.canUpload"
        type="warning"
        :closable="false"
        class="upload-view__readonly-alert"
      >
        <template #title>
          <span>🔒 只读模式 - 当前账号没有上传权限，仅可浏览分类</span>
        </template>
      </el-alert>

      <!-- 顶部信息栏 -->
      <div class="upload-view__header">
        <div class="upload-view__title-area">
          <div class="upload-view__title-badge">🎨 Workspace</div>
          <h1 class="upload-view__title">上传中心</h1>
        </div>
        <HeaderStats
          :stats="stats"
          :rate-limit="rateLimit"
          :loading="loadingStats"
          @refresh="refreshStats"
        />
      </div>

      <!-- 三栏布局 -->
      <div class="upload-view__content">
        <CategorySidebar
          :series="series"
          :tree-data="treeData"
          :loading="loading"
          :target-path="uploadStore.targetPath"
          :load-node="loadNode"
          @select-series="selectSeries"
          @select-category="handleCategorySelect"
          @create="showModal = true"
        />

        <!-- 中间列：统计条 + 上传面板 -->
        <div class="upload-view__center">
          <WallpaperStatsBar
            :stats-data="workflowStore.statsData"
            @show-history="showHistoryModal = true"
          />
          <UploadPanel
            :target-path="uploadStore.targetPath"
            :files="uploadStore.files"
            :selected-id="previewFile?.id"
            :uploading="uploading"
            :progress="uploadStore.totalProgress"
            :pending-count="uploadStore.pendingFiles.length"
            :error-count="uploadStore.errorFiles.length"
            @add-files="addFiles"
            @remove="uploadStore.removeFile"
            @remove-batch="uploadStore.removeFiles"
            @clear="uploadStore.clearFiles"
            @retry="uploadStore.retryFailed"
            @upload="handleUpload"
            @select="selectPreview"
            @change-target="handleChangeTarget"
          />
        </div>

        <!-- 右侧栏：预览 + 工作流 -->
        <div class="upload-view__sidebar">
          <ImagePreview :file="previewFile" class="upload-view__preview" />
          <WorkflowPanel class="upload-view__workflow" />
        </div>
      </div>

      <CreateCategoryModal
        :visible="showModal"
        :parent-category="selectedL1"
        :creating="creating"
        @close="showModal = false"
        @create="createCategory"
      />

      <UploadProgressModal
        v-model="showProgressModal"
        :files="uploadStore.files"
        :uploading="uploading"
        :current-index="uploadStore.currentFileIndex"
        @retry="handleRetry"
        @close="showProgressModal = false"
      />

      <!-- 发布历史弹窗 -->
      <ReleaseHistoryModal
        :visible="showHistoryModal"
        :stats-data="workflowStore.statsData"
        @close="showHistoryModal = false"
      />

      <!-- 目录选择弹窗 -->
      <TargetSelectModal
        :visible="showTargetModal"
        :file="targetEditFile"
        :current-series="series"
        :tree-data="treeData"
        :load-node="loadNode"
        @close="showTargetModal = false"
        @confirm="handleTargetConfirm"
      />
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import MainLayout from '@/components/MainLayout.vue'
import HeaderStats from '@/components/upload/HeaderStats.vue'
import CategorySidebar from '@/components/upload/CategorySidebar.vue'
import UploadPanel from '@/components/upload/UploadPanel.vue'
import ImagePreview from '@/components/upload/ImagePreview.vue'
import WorkflowPanel from '@/components/upload/WorkflowPanel.vue'
import WallpaperStatsBar from '@/components/upload/WallpaperStatsBar.vue'
import ReleaseHistoryModal from '@/components/upload/ReleaseHistoryModal.vue'
import CreateCategoryModal from '@/components/upload/CreateCategoryModal.vue'
import UploadProgressModal from '@/components/upload/UploadProgressModal.vue'
import TargetSelectModal from '@/components/upload/TargetSelectModal.vue'
import { githubService } from '@/services/github'
import { useConfigStore } from '@/stores/config'
import { useUploadStore } from '@/stores/upload'
import { useAuthStore } from '@/stores/auth'
import { useWorkflowStore } from '@/stores/workflow'
import { useAnimation } from '@/composables/useAnimation'

const configStore = useConfigStore()
const uploadStore = useUploadStore()
const authStore = useAuthStore()
const workflowStore = useWorkflowStore()
const { staggerIn } = useAnimation()

const viewRef = ref(null)
const series = ref('desktop')
const treeData = ref([])
const loading = ref(false)
const loadingStats = ref(false)
const selectedL1 = ref('')
const previewFile = ref(null)
const showModal = ref(false)
const showProgressModal = ref(false)
const showHistoryModal = ref(false)
const showTargetModal = ref(false)
const targetEditFile = ref(null)
const creating = ref(false)

const stats = reactive({ desktop: 0, mobile: 0, avatar: 0, total: 0 })

const uploading = computed(() => uploadStore.uploading)
const rateLimit = computed(() => uploadStore.getRateLimit())

const categoryCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function getCache(key) {
  const c = categoryCache.get(key)
  return c && Date.now() - c.timestamp < CACHE_TTL ? c.data : null
}

function setCache(key, data) {
  categoryCache.set(key, { data, timestamp: Date.now() })
}

function selectSeries(value) {
  series.value = value
  uploadStore.setTarget(value, '', '')
  selectedL1.value = ''
  loadRootCategories()
}

async function loadRootCategories() {
  const cacheKey = `${series.value}-root`
  const cached = getCache(cacheKey)
  if (cached) {
    treeData.value = cached
    return
  }

  loading.value = true
  try {
    const { owner, repo, branch } = configStore.config
    const contents = await githubService.getContents(
      owner,
      repo,
      `wallpaper/${series.value}`,
      branch
    )
    const categories = contents
      .filter(i => i.type === 'dir')
      .map(i => ({
        name: i.name,
        path: i.path,
        type: 'l1',
        children: [],
        loaded: false
      }))
    treeData.value = categories
    setCache(cacheKey, categories)
  } catch {
    treeData.value = []
  } finally {
    loading.value = false
  }
}

async function loadNode(node, resolve) {
  if (node.level === 0) {
    resolve(treeData.value)
    return
  }
  if (node.data.type !== 'l1') {
    resolve([])
    return
  }

  const cached = getCache(node.data.path)
  if (cached) {
    resolve(cached)
    return
  }

  try {
    const { owner, repo, branch } = configStore.config
    const contents = await githubService.getContents(owner, repo, node.data.path, branch)
    const children = contents
      .filter(i => i.type === 'dir')
      .map(i => ({ name: i.name, path: i.path, type: 'l2' }))
    setCache(node.data.path, children)
    resolve(children)
  } catch {
    resolve([])
  }
}

function handleCategorySelect({ data, node }) {
  if (data.type === 'l1') {
    selectedL1.value = data.name
    uploadStore.setTarget(series.value, data.name, '')
  } else {
    selectedL1.value = node.parent.data.name
    uploadStore.setTarget(series.value, node.parent.data.name, data.name)
  }
}

function addFiles(files) {
  const imgs = files.filter(f => f.type.startsWith('image/'))
  if (!imgs.length) {
    ElMessage.warning('请选择图片文件')
    return
  }
  const added = uploadStore.addFiles(imgs)
  if (added.length < imgs.length)
    ElMessage.warning(`${imgs.length - added.length} 个文件不符合要求`)
}

async function handleUpload() {
  // 检查是否有文件没有目标路径
  const filesWithoutTarget = uploadStore.pendingFiles.filter(f => !f.targetPath)
  if (filesWithoutTarget.length > 0) {
    ElMessage.warning(`有 ${filesWithoutTarget.length} 个文件未设置上传目录`)
    return
  }

  // 打开进度弹框
  showProgressModal.value = true

  try {
    const results = await uploadStore.uploadAll()
    const ok = results.results.filter(r => r.success).length
    const fail = results.results.length - ok

    // 更新会话上传计数
    if (ok > 0) {
      workflowStore.addSessionUpload(ok)
    }

    ElMessage[fail ? 'warning' : 'success'](
      fail ? `上传完成：${ok} 成功，${fail} 失败` : `成功上传 ${ok} 个文件`
    )
    refreshStats()

    // 清理成功上传的文件（释放内存）
    if (ok > 0) {
      uploadStore.clearSuccessFiles()
    }

    // 上传成功后刷新工作流状态（延迟 2 秒等待 GitHub API 同步）
    if (ok > 0) {
      setTimeout(async () => {
        const { owner, repo, branch } = configStore.config
        await workflowStore.refreshPendingInfo(owner, repo, branch)
        // 如果还是 0，再等 2 秒重试一次
        if (workflowStore.pendingInfo.pendingCount === 0) {
          setTimeout(() => {
            workflowStore.refreshPendingInfo(owner, repo, branch)
          }, 2000)
        }
      }, 2000)
    }
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  }
}

function selectPreview(file) {
  previewFile.value = file
}

function handleChangeTarget(file) {
  targetEditFile.value = file
  showTargetModal.value = true
}

function handleTargetConfirm({ series: newSeries, l1, l2 }) {
  if (targetEditFile.value) {
    uploadStore.updateFileTarget(targetEditFile.value.id, newSeries, l1, l2)
  }
  showTargetModal.value = false
  targetEditFile.value = null
}

async function handleRetry() {
  try {
    const results = await uploadStore.retryFailed()
    if (!results) return

    const ok = results.results.filter(r => r.success).length
    const fail = results.results.length - ok

    // 更新会话上传计数
    if (ok > 0) {
      workflowStore.addSessionUpload(ok)
    }

    ElMessage[fail ? 'warning' : 'success'](
      fail ? `重试完成：${ok} 成功，${fail} 失败` : `重试成功，${ok} 个文件已上传`
    )
    refreshStats()

    // 清理成功上传的文件
    if (ok > 0) {
      uploadStore.clearSuccessFiles()
    }

    // 刷新工作流状态
    if (ok > 0) {
      setTimeout(async () => {
        const { owner, repo, branch } = configStore.config
        await workflowStore.refreshPendingInfo(owner, repo, branch)
        if (workflowStore.pendingInfo.pendingCount === 0) {
          setTimeout(() => {
            workflowStore.refreshPendingInfo(owner, repo, branch)
          }, 2000)
        }
      }, 2000)
    }
  } catch (e) {
    ElMessage.error(e.message || '重试失败')
  }
}

async function createCategory(form) {
  if (!form.name?.trim()) {
    ElMessage.error('分类名称不能为空')
    return
  }
  if (/[/\\:*?"<>|]/.test(form.name)) {
    ElMessage.error('分类名称包含非法字符')
    return
  }
  if (form.level === 'l2' && !selectedL1.value) {
    ElMessage.error('请先选择一级分类')
    return
  }

  creating.value = true
  try {
    const { owner, repo, branch } = configStore.config
    let path = `wallpaper/${series.value}`
    if (form.level === 'l2') path += `/${selectedL1.value}`
    path += `/${form.name}/.gitkeep`

    await githubService.createFile(owner, repo, path, '', `Create category: ${form.name}`, branch)
    ElMessage.success('分类创建成功')
    showModal.value = false
    categoryCache.clear()
    loadRootCategories()
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function refreshStats() {
  loadingStats.value = true
  try {
    const { owner, repo, branch } = configStore.config
    for (const type of ['desktop', 'mobile', 'avatar']) {
      try {
        const c = await githubService.getContents(owner, repo, `wallpaper/${type}`, branch)
        stats[type] = c.filter(i => i.type === 'dir').length
      } catch {
        stats[type] = 0
      }
    }
    stats.total = stats.desktop + stats.mobile + stats.avatar
  } catch {
    // 忽略统计加载错误
  } finally {
    loadingStats.value = false
  }
}

onMounted(() => {
  loadRootCategories()
  refreshStats()
  const els = viewRef.value?.querySelectorAll('.upload-view__content > *')
  if (els?.length) staggerIn(els, { duration: 0.5, stagger: 0.1, y: 20 })
})

watch(series, () => {
  selectedL1.value = ''
})
watch(
  () => uploadStore.files,
  files => {
    if (files.length > 0 && !previewFile.value) previewFile.value = files[0]
    else if (files.length === 0) previewFile.value = null
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.upload-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $spacing-6;
  gap: $spacing-5;
  overflow: hidden;

  &__readonly-alert {
    flex-shrink: 0;
    border-radius: $radius-lg;
    background: rgba(230, 162, 60, 0.1);
    border: 1px solid rgba(230, 162, 60, 0.3);

    :deep(.el-alert__content) {
      color: #e6a23c;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  &__title-area {
    display: flex;
    align-items: center;
    gap: $spacing-4;
  }

  &__title-badge {
    padding: $spacing-2 $spacing-4;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-full;
    font-size: $font-size-sm;
    color: $gray-300;
  }

  &__title {
    margin: 0;
    font-size: $font-size-2xl;
    font-weight: 700;
    background: $primary-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__content {
    flex: 1;
    display: grid;
    grid-template-columns: 320px 1fr 360px;
    gap: $spacing-5;
    min-height: 0;
    overflow: hidden;

    // 确保子元素撑满且高度固定
    > * {
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }
  }

  &__center {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
    min-height: 0;
    overflow: hidden;
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
    min-height: 0;
    overflow: hidden;
  }

  &__preview {
    flex: 1;
    min-height: 0;
  }

  &__workflow {
    flex: 1.8;
    min-height: 0;
    overflow: hidden;
  }
}

// 响应式
@media (max-width: 1400px) {
  .upload-view__content {
    grid-template-columns: 280px 1fr 320px;
  }
}

@media (max-width: 1200px) {
  .upload-view__content {
    grid-template-columns: 260px 1fr 280px;
  }
}
</style>
