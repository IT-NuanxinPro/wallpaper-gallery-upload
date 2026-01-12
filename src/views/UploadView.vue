<template>
  <MainLayout>
    <div ref="viewRef" class="upload-view">
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
          @clear="uploadStore.clearFiles"
          @retry="uploadStore.retryFailed"
          @upload="handleUpload"
          @select="selectPreview"
        />

        <ImagePreview :file="previewFile" />
      </div>

      <CreateCategoryModal
        :visible="showModal"
        :parent-category="selectedL1"
        :creating="creating"
        @close="showModal = false"
        @create="createCategory"
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
import CreateCategoryModal from '@/components/upload/CreateCategoryModal.vue'
import { githubService } from '@/services/github'
import { useConfigStore } from '@/stores/config'
import { useUploadStore } from '@/stores/upload'
import { useAnimation } from '@/composables/useAnimation'

const configStore = useConfigStore()
const uploadStore = useUploadStore()
const { staggerIn } = useAnimation()

const viewRef = ref(null)
const series = ref('desktop')
const treeData = ref([])
const loading = ref(false)
const loadingStats = ref(false)
const selectedL1 = ref('')
const previewFile = ref(null)
const showModal = ref(false)
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
  if (!uploadStore.targetPath) {
    ElMessage.warning('请先选择上传目录')
    return
  }
  try {
    const results = await uploadStore.uploadAll()
    const ok = results.filter(r => r.success).length
    const fail = results.length - ok
    ElMessage[fail ? 'warning' : 'success'](
      fail ? `上传完成：${ok} 成功，${fail} 失败` : `成功上传 ${ok} 个文件`
    )
    refreshStats()
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  }
}

function selectPreview(file) {
  previewFile.value = file
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
