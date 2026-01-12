<template>
  <MainLayout>
    <div ref="viewRef" class="upload-view">
      <!-- 顶部标题区 -->
      <div class="upload-view__header">
        <div class="upload-view__title-area">
          <h1 class="upload-view__title">
            <span class="upload-view__title-icon">📤</span>
            壁纸上传
          </h1>
          <p class="upload-view__subtitle">选择分类后拖拽图片即可上传</p>
        </div>

        <!-- API 配额 -->
        <div v-if="showQuotaInfo" class="upload-view__quota">
          <div class="upload-view__quota-info">
            <span class="upload-view__quota-label">API 配额</span>
            <span class="upload-view__quota-value"
              >{{ rateLimit.remaining }} / {{ rateLimit.limit }}</span
            >
          </div>
          <div class="upload-view__quota-bar">
            <div
              class="upload-view__quota-fill"
              :style="{ width: quotaPercent + '%' }"
              :class="quotaClass"
            ></div>
          </div>
        </div>
      </div>

      <div class="upload-view__content">
        <!-- 左侧：分类选择 -->
        <div class="upload-view__sidebar">
          <div class="upload-view__sidebar-header">
            <h3 class="upload-view__sidebar-title">
              <el-icon><Folder /></el-icon>
              选择分类
            </h3>
            <el-tag v-if="!uploadStore.targetPath" type="warning" size="small" effect="dark">
              必选
            </el-tag>
            <el-tag v-else type="success" size="small" effect="dark"> 已选 </el-tag>
          </div>

          <!-- 系列选择 -->
          <div class="upload-view__series">
            <button
              v-for="s in seriesList"
              :key="s.value"
              class="upload-view__series-btn"
              :class="{ 'upload-view__series-btn--active': series === s.value }"
              @click="selectSeries(s.value)"
            >
              <span class="upload-view__series-icon">{{ s.emoji }}</span>
              <span class="upload-view__series-label">{{ s.label }}</span>
            </button>
          </div>

          <!-- 分类树 -->
          <div v-loading="loading" class="upload-view__tree">
            <el-tree
              ref="treeRef"
              :data="treeData"
              :props="treeProps"
              :load="loadNode"
              lazy
              highlight-current
              node-key="path"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <div class="upload-view__tree-node">
                  <span class="upload-view__tree-icon">{{ data.type === 'l1' ? '📁' : '📂' }}</span>
                  <span class="upload-view__tree-label">{{ node.label }}</span>
                </div>
              </template>
            </el-tree>

            <div v-if="!loading && treeData.length === 0" class="upload-view__tree-empty">
              <span>暂无分类</span>
            </div>
          </div>

          <!-- 新建分类按钮 -->
          <button class="upload-view__new-btn" @click="showNewCategoryDialog = true">
            <el-icon><Plus /></el-icon>
            新建分类
          </button>
        </div>

        <!-- 右侧：上传区域 -->
        <div class="upload-view__main">
          <!-- 当前路径显示 -->
          <div
            class="upload-view__path-bar"
            :class="{ 'upload-view__path-bar--empty': !uploadStore.targetPath }"
          >
            <div class="upload-view__path-icon">
              <el-icon v-if="uploadStore.targetPath"><FolderOpened /></el-icon>
              <el-icon v-else><Warning /></el-icon>
            </div>
            <div class="upload-view__path-info">
              <span class="upload-view__path-label">{{
                uploadStore.targetPath ? '上传目录' : '请先选择分类'
              }}</span>
              <span class="upload-view__path-value">{{
                uploadStore.targetPath || '左侧选择分类后才能上传'
              }}</span>
            </div>
          </div>

          <!-- 批量上传警告 -->
          <div v-if="showBatchWarning" class="upload-view__warning">
            <div class="upload-view__warning-icon">⚠️</div>
            <div class="upload-view__warning-content">
              <strong>批量上传提示</strong>
              <p>
                已选择 {{ uploadStore.pendingFiles.length }} 个文件，预计需要 {{ estimatedTime }}
              </p>
            </div>
          </div>

          <!-- 拖拽上传区域 -->
          <div
            class="upload-view__dropzone"
            :class="{
              'upload-view__dropzone--active': isDragging,
              'upload-view__dropzone--disabled': !uploadStore.targetPath || uploading
            }"
            @dragenter.prevent="handleDragEnter"
            @dragleave.prevent="handleDragLeave"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              class="upload-view__input"
              @change="handleFileSelect"
            />

            <div class="upload-view__dropzone-content">
              <div class="upload-view__dropzone-icon">
                {{ uploadStore.targetPath ? '🖼️' : '🔒' }}
              </div>
              <p class="upload-view__dropzone-text">
                {{ uploadStore.targetPath ? '拖拽图片到此处，或点击选择' : '请先在左侧选择分类' }}
              </p>
              <p class="upload-view__dropzone-hint">支持 JPG、PNG、WebP，单个最大 25MB</p>
            </div>
          </div>

          <!-- 文件列表 -->
          <div v-if="uploadStore.files.length > 0" class="upload-view__files">
            <div class="upload-view__files-header">
              <span>待上传 ({{ uploadStore.files.length }})</span>
              <button class="upload-view__files-clear" @click="uploadStore.clearFiles">
                清空全部
              </button>
            </div>

            <div class="upload-view__files-grid">
              <div
                v-for="file in uploadStore.files"
                :key="file.id"
                class="upload-view__file"
                :class="`upload-view__file--${file.status}`"
              >
                <img :src="file.preview" class="upload-view__file-img" />
                <div class="upload-view__file-overlay">
                  <el-progress
                    v-if="file.status === 'uploading'"
                    type="circle"
                    :percentage="file.progress"
                    :width="40"
                    :stroke-width="3"
                  />
                  <span
                    v-else-if="file.status === 'success'"
                    class="upload-view__file-status upload-view__file-status--success"
                    >✓</span
                  >
                  <span
                    v-else-if="file.status === 'error'"
                    class="upload-view__file-status upload-view__file-status--error"
                    >✗</span
                  >
                  <button
                    v-else
                    class="upload-view__file-remove"
                    @click.stop="uploadStore.removeFile(file.id)"
                  >
                    ×
                  </button>
                </div>
                <div class="upload-view__file-name">{{ file.name }}</div>
              </div>
            </div>
          </div>

          <!-- 上传按钮 -->
          <div v-if="uploadStore.files.length > 0" class="upload-view__actions">
            <button
              v-if="uploadStore.errorFiles.length > 0"
              class="upload-view__btn upload-view__btn--secondary"
              @click="uploadStore.retryFailed"
            >
              重试失败 ({{ uploadStore.errorFiles.length }})
            </button>
            <button
              class="upload-view__btn upload-view__btn--primary"
              :class="{ 'upload-view__btn--loading': uploading }"
              :disabled="
                !uploadStore.targetPath || uploadStore.pendingFiles.length === 0 || uploading
              "
              @click="handleUpload"
            >
              <span v-if="uploading">上传中 {{ uploadStore.totalProgress }}%</span>
              <span v-else>开始上传</span>
            </button>
          </div>

          <!-- 底部功能区 -->
          <div class="upload-view__bottom">
            <!-- 工作流触发 -->
            <div class="upload-view__workflow">
              <div class="upload-view__workflow-header">
                <span class="upload-view__workflow-icon">⚡</span>
                <div class="upload-view__workflow-info">
                  <h4>图片处理工作流</h4>
                  <p>上传完成后触发，自动生成缩略图和预览图</p>
                </div>
              </div>
              <WorkflowTrigger />
            </div>

            <!-- 分类统计 -->
            <div class="upload-view__stats">
              <div class="upload-view__stats-header">
                <span class="upload-view__stats-icon">📊</span>
                <h4>分类统计</h4>
                <button
                  class="upload-view__stats-refresh"
                  :disabled="loadingStats"
                  @click="refreshStats"
                >
                  <el-icon :class="{ 'is-loading': loadingStats }"><Refresh /></el-icon>
                </button>
              </div>
              <div class="upload-view__stats-grid">
                <div class="upload-view__stat-item">
                  <span class="upload-view__stat-value">{{ stats.desktop }}</span>
                  <span class="upload-view__stat-label">🖥️ 电脑分类</span>
                </div>
                <div class="upload-view__stat-item">
                  <span class="upload-view__stat-value">{{ stats.mobile }}</span>
                  <span class="upload-view__stat-label">📱 手机分类</span>
                </div>
                <div class="upload-view__stat-item">
                  <span class="upload-view__stat-value">{{ stats.avatar }}</span>
                  <span class="upload-view__stat-label">👤 头像分类</span>
                </div>
                <div class="upload-view__stat-item upload-view__stat-item--total">
                  <span class="upload-view__stat-value">{{ stats.total }}</span>
                  <span class="upload-view__stat-label">📁 总分类</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 新建分类弹窗 -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showNewCategoryDialog"
            class="upload-view__modal-overlay"
            @click.self="showNewCategoryDialog = false"
          >
            <div class="upload-view__modal">
              <div class="upload-view__modal-header">
                <h3>📁 新建分类</h3>
                <button class="upload-view__modal-close" @click="showNewCategoryDialog = false">
                  ×
                </button>
              </div>

              <div class="upload-view__modal-body">
                <div class="upload-view__form-group">
                  <label>分类级别</label>
                  <div class="upload-view__radio-group">
                    <label
                      class="upload-view__radio"
                      :class="{ 'upload-view__radio--active': newCategoryForm.level === 'l1' }"
                    >
                      <input v-model="newCategoryForm.level" type="radio" value="l1" />
                      <span class="upload-view__radio-dot"></span>
                      一级分类
                    </label>
                    <label
                      class="upload-view__radio"
                      :class="{
                        'upload-view__radio--active': newCategoryForm.level === 'l2',
                        'upload-view__radio--disabled': !selectedL1
                      }"
                    >
                      <input
                        v-model="newCategoryForm.level"
                        type="radio"
                        value="l2"
                        :disabled="!selectedL1"
                      />
                      <span class="upload-view__radio-dot"></span>
                      二级分类
                    </label>
                  </div>
                </div>

                <div v-if="newCategoryForm.level === 'l2'" class="upload-view__form-group">
                  <label>父分类</label>
                  <div class="upload-view__form-value">{{ selectedL1 }}</div>
                </div>

                <div class="upload-view__form-group">
                  <label>分类名称</label>
                  <input
                    v-model="newCategoryForm.name"
                    type="text"
                    class="upload-view__form-input"
                    placeholder="请输入分类名称"
                    maxlength="20"
                  />
                </div>
              </div>

              <div class="upload-view__modal-footer">
                <button
                  class="upload-view__btn upload-view__btn--ghost"
                  @click="showNewCategoryDialog = false"
                >
                  取消
                </button>
                <button
                  class="upload-view__btn upload-view__btn--primary"
                  :disabled="creating"
                  @click="createCategory"
                >
                  {{ creating ? '创建中...' : '创建' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Folder, FolderOpened, Plus, Warning, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MainLayout from '@/components/MainLayout.vue'
import WorkflowTrigger from '@/components/WorkflowTrigger.vue'
import { githubService } from '@/services/github'
import { useConfigStore } from '@/stores/config'
import { useUploadStore } from '@/stores/upload'
import { useAnimation } from '@/composables/useAnimation'

const configStore = useConfigStore()
const uploadStore = useUploadStore()
const { staggerIn } = useAnimation()

const viewRef = ref(null)
const fileInputRef = ref(null)
const treeRef = ref(null)

// 系列列表
const seriesList = [
  { value: 'desktop', label: '电脑壁纸', emoji: '🖥️' },
  { value: 'mobile', label: '手机壁纸', emoji: '📱' },
  { value: 'avatar', label: '头像', emoji: '👤' }
]

// 状态
const series = ref('desktop')
const treeData = ref([])
const loading = ref(false)
const isDragging = ref(false)
const showNewCategoryDialog = ref(false)
const creating = ref(false)
const selectedL1 = ref('')
const loadingStats = ref(false)

// 统计数据
const stats = reactive({
  desktop: 0,
  mobile: 0,
  avatar: 0,
  total: 0
})

// 新建分类表单
const newCategoryForm = ref({
  level: 'l1',
  name: ''
})

// 树配置
const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: data => data.type === 'l2'
}

// 计算属性
const uploading = computed(() => uploadStore.uploading)
const rateLimit = computed(() => uploadStore.getRateLimit())
const showQuotaInfo = computed(() => rateLimit.value.remaining < rateLimit.value.limit)
const quotaPercent = computed(() => {
  const { remaining, limit } = rateLimit.value
  return Math.round((remaining / limit) * 100)
})
const quotaClass = computed(() => {
  const percent = quotaPercent.value
  if (percent > 50) return 'upload-view__quota-fill--good'
  if (percent > 20) return 'upload-view__quota-fill--warning'
  return 'upload-view__quota-fill--danger'
})
const showBatchWarning = computed(() => {
  return uploadStore.shouldWarnBatchUpload(uploadStore.pendingFiles.length)
})
const estimatedTime = computed(() => {
  const seconds = uploadStore.estimateUploadTime(uploadStore.pendingFiles.length)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} 分钟`
})

// 分类缓存
const categoryCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function getCache(key) {
  const cached = categoryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCache(key, data) {
  categoryCache.set(key, { data, timestamp: Date.now() })
}

// 选择系列
function selectSeries(value) {
  series.value = value
  uploadStore.setTarget(value, '', '')
  selectedL1.value = ''
  loadRootCategories()
}

// 加载根分类
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
    const path = `wallpaper/${series.value}`
    const contents = await githubService.getContents(owner, repo, path, branch)

    const categories = contents
      .filter(item => item.type === 'dir')
      .map(item => ({
        name: item.name,
        path: item.path,
        type: 'l1',
        children: [],
        loaded: false
      }))

    treeData.value = categories
    setCache(cacheKey, categories)
  } catch (error) {
    console.error('加载分类失败:', error)
    treeData.value = []
  } finally {
    loading.value = false
  }
}

// 懒加载子节点
async function loadNode(node, resolve) {
  if (node.level === 0) {
    resolve(treeData.value)
    return
  }

  if (node.data.type !== 'l1') {
    resolve([])
    return
  }

  const cacheKey = node.data.path
  const cached = getCache(cacheKey)

  if (cached) {
    resolve(cached)
    return
  }

  try {
    const { owner, repo, branch } = configStore.config
    const contents = await githubService.getContents(owner, repo, node.data.path, branch)

    const children = contents
      .filter(item => item.type === 'dir')
      .map(item => ({
        name: item.name,
        path: item.path,
        type: 'l2'
      }))

    setCache(cacheKey, children)
    resolve(children)
  } catch (error) {
    console.error('加载子分类失败:', error)
    resolve([])
  }
}

// 点击节点
function handleNodeClick(data, node) {
  if (data.type === 'l1') {
    selectedL1.value = data.name
    uploadStore.setTarget(series.value, data.name, '')
  } else if (data.type === 'l2') {
    const parentData = node.parent.data
    selectedL1.value = parentData.name
    uploadStore.setTarget(series.value, parentData.name, data.name)
  }
}

// 文件上传相关
function triggerFileInput() {
  if (!uploadStore.targetPath) {
    ElMessage.warning('请先选择上传分类')
    return
  }
  if (!uploading.value) {
    fileInputRef.value?.click()
  }
}

function handleDragEnter() {
  if (uploadStore.targetPath && !uploading.value) {
    isDragging.value = true
  }
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e) {
  isDragging.value = false
  if (!uploadStore.targetPath) {
    ElMessage.warning('请先选择上传分类')
    return
  }
  if (uploading.value) return

  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  addFiles(files)
  e.target.value = ''
}

function addFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'))

  if (imageFiles.length === 0) {
    ElMessage.warning('请选择图片文件')
    return
  }

  const added = uploadStore.addFiles(imageFiles)

  if (added.length < imageFiles.length) {
    ElMessage.warning(`${imageFiles.length - added.length} 个文件不符合要求`)
  }
}

async function handleUpload() {
  if (!uploadStore.targetPath) {
    ElMessage.warning('请先选择上传目录')
    return
  }

  try {
    const results = await uploadStore.uploadAll()
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      ElMessage.success(`成功上传 ${successCount} 个文件`)
    } else {
      ElMessage.warning(`上传完成：${successCount} 成功，${failCount} 失败`)
    }

    // 刷新统计
    refreshStats()
  } catch (error) {
    ElMessage.error(error.message || '上传失败')
  }
}

// 创建分类
function validateCategoryName(name) {
  if (!name || !name.trim()) {
    return { valid: false, error: '分类名称不能为空' }
  }
  const invalidChars = /[/\\:*?"<>|]/
  if (invalidChars.test(name)) {
    return { valid: false, error: '分类名称包含非法字符' }
  }
  return { valid: true }
}

async function createCategory() {
  const validation = validateCategoryName(newCategoryForm.value.name)
  if (!validation.valid) {
    ElMessage.error(validation.error)
    return
  }

  if (newCategoryForm.value.level === 'l2' && !selectedL1.value) {
    ElMessage.error('请先选择一级分类')
    return
  }

  creating.value = true
  try {
    const { owner, repo, branch } = configStore.config
    let path = `wallpaper/${series.value}`

    if (newCategoryForm.value.level === 'l2') {
      path += `/${selectedL1.value}`
    }
    path += `/${newCategoryForm.value.name}/.gitkeep`

    await githubService.createFile(
      owner,
      repo,
      path,
      '',
      `Create category: ${newCategoryForm.value.name}`,
      branch
    )

    ElMessage.success('分类创建成功')
    showNewCategoryDialog.value = false
    newCategoryForm.value.name = ''

    categoryCache.clear()
    loadRootCategories()
  } catch (error) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// 统计相关
async function refreshStats() {
  loadingStats.value = true
  try {
    const { owner, repo, branch } = configStore.config

    // 简单统计：获取各分类的一级目录数量
    const types = ['desktop', 'mobile', 'avatar']
    for (const type of types) {
      try {
        const contents = await githubService.getContents(owner, repo, `wallpaper/${type}`, branch)
        stats[type] = contents.filter(item => item.type === 'dir').length
      } catch {
        stats[type] = 0
      }
    }
    stats.total = stats.desktop + stats.mobile + stats.avatar
  } catch (error) {
    console.error('刷新统计失败:', error)
  } finally {
    loadingStats.value = false
  }
}

// 初始化
onMounted(() => {
  loadRootCategories()
  refreshStats()

  const elements = viewRef.value?.querySelectorAll('.upload-view__sidebar, .upload-view__main')
  if (elements?.length) {
    staggerIn(elements, { duration: 0.5, stagger: 0.1, y: 20 })
  }
})

watch(series, () => {
  selectedL1.value = ''
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.upload-view {
  min-height: calc(100vh - 80px);
  padding-bottom: $spacing-8;

  // 顶部标题区
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-6;
  }

  &__title-area {
    display: flex;
    flex-direction: column;
    gap: $spacing-1;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: $spacing-3;
    font-size: $font-size-2xl;
    font-weight: 700;
    color: $white;
    margin: 0;

    &-icon {
      font-size: 28px;
    }
  }

  &__subtitle {
    color: $gray-400;
    font-size: $font-size-sm;
    margin: 0;
  }

  // API 配额
  &__quota {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-lg;
    min-width: 200px;

    &-info {
      display: flex;
      justify-content: space-between;
      font-size: $font-size-xs;
    }

    &-label {
      color: $gray-400;
    }
    &-value {
      color: $white;
      font-weight: 500;
    }

    &-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    &-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;

      &--good {
        background: linear-gradient(90deg, #10b981, #34d399);
      }
      &--warning {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }
      &--danger {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }
    }
  }

  // 主内容区
  &__content {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: $spacing-6;
    align-items: stretch;
  }

  // 左侧边栏 - 与右侧底部对齐
  &__sidebar {
    display: flex;
    flex-direction: column;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-5;
    align-self: stretch;

    &-header {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      margin-bottom: $spacing-4;
    }

    &-title {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      font-size: $font-size-base;
      font-weight: 600;
      color: $white;
      margin: 0;
      flex: 1;

      .el-icon {
        color: $primary-start;
      }
    }
  }

  // 系列选择按钮
  &__series {
    display: flex;
    gap: $spacing-2;
    margin-bottom: $spacing-4;

    &-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-1;
      padding: $spacing-3 $spacing-2;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid transparent;
      border-radius: $radius-lg;
      cursor: pointer;
      transition: all $duration-normal $ease-out;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      &--active {
        background: $primary-gradient;
        border-color: transparent;
        box-shadow: 0 4px 20px rgba($primary-start, 0.4);
      }
    }

    &-icon {
      font-size: 24px;
    }
    &-label {
      font-size: $font-size-xs;
      color: $gray-300;

      .upload-view__series-btn--active & {
        color: $white;
        font-weight: 500;
      }
    }
  }

  // 分类树 - 占据剩余空间
  &__tree {
    flex: 1;
    overflow-y: auto;
    margin-bottom: $spacing-4;
    min-height: 200px;

    &-node {
      display: flex;
      align-items: center;
      gap: $spacing-2;
      padding: $spacing-1 0;
    }

    &-icon {
      font-size: 16px;
    }
    &-label {
      color: $gray-200;
    }

    &-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100px;
      color: $gray-500;
      font-size: $font-size-sm;
    }
  }

  // 新建分类按钮
  &__new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-2;
    padding: $spacing-3;
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: $radius-lg;
    color: $gray-400;
    cursor: pointer;
    transition: all $duration-normal;

    &:hover {
      background: rgba($primary-start, 0.1);
      border-color: $primary-start;
      color: $primary-start;
    }
  }

  // 右侧主区域
  &__main {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  // 路径显示栏
  &__path-bar {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    padding: $spacing-4 $spacing-5;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid rgba($success, 0.3);
    border-radius: $radius-xl;

    &--empty {
      border-color: rgba($warning, 0.3);
      background: rgba($warning, 0.05);
    }
  }

  &__path-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($success, 0.15);
    border-radius: $radius-lg;

    .el-icon {
      font-size: 24px;
      color: $success;
    }

    .upload-view__path-bar--empty & {
      background: rgba($warning, 0.15);
      .el-icon {
        color: $warning;
      }
    }
  }

  &__path-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__path-label {
    font-size: $font-size-xs;
    color: $gray-400;
  }
  &__path-value {
    font-size: $font-size-base;
    color: $white;
    font-family: monospace;

    .upload-view__path-bar--empty & {
      color: $warning;
      font-family: inherit;
    }
  }

  // 批量警告
  &__warning {
    display: flex;
    align-items: center;
    gap: $spacing-4;
    padding: $spacing-4;
    background: rgba($warning, 0.1);
    border: 1px solid rgba($warning, 0.3);
    border-radius: $radius-xl;

    &-icon {
      font-size: 32px;
    }
    &-content {
      strong {
        color: $warning;
        display: block;
        margin-bottom: $spacing-1;
      }
      p {
        color: $gray-300;
        font-size: $font-size-sm;
        margin: 0;
      }
    }
  }

  // 拖拽区域 - 更高
  &__dropzone {
    position: relative;
    padding: $spacing-16 $spacing-8;
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: $radius-xl;
    cursor: pointer;
    transition: all $duration-normal;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(&--disabled) {
      border-color: rgba($primary-start, 0.5);
      background: rgba($primary-start, 0.05);
    }

    &--active {
      border-color: $primary-start;
      background: rgba($primary-start, 0.1);
      box-shadow: 0 0 30px rgba($primary-start, 0.2);
    }

    &--disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-3;
    }

    &-icon {
      font-size: 56px;
    }
    &-text {
      font-size: $font-size-lg;
      color: $gray-200;
      margin: 0;
    }
    &-hint {
      font-size: $font-size-sm;
      color: $gray-500;
      margin: 0;
    }
  }

  &__input {
    display: none;
  }

  // 文件列表
  &__files {
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-5;

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-4;
      color: $gray-300;
      font-size: $font-size-sm;
    }

    &-clear {
      background: none;
      border: none;
      color: $gray-500;
      cursor: pointer;
      font-size: $font-size-sm;
      &:hover {
        color: $danger;
      }
    }

    &-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: $spacing-3;
    }
  }

  &__file {
    position: relative;
    border-radius: $radius-lg;
    overflow: hidden;
    aspect-ratio: 1;

    &-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity $duration-normal;
    }

    &:hover &-overlay,
    &--uploading &-overlay,
    &--success &-overlay,
    &--error &-overlay {
      opacity: 1;
    }

    &-remove {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      color: $white;
      font-size: 18px;
      cursor: pointer;
      &:hover {
        background: $danger;
      }
    }

    &-status {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 20px;
      font-weight: bold;

      &--success {
        background: rgba($success, 0.2);
        color: $success;
      }
      &--error {
        background: rgba($danger, 0.2);
        color: $danger;
      }
    }

    &-name {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: $spacing-1 $spacing-2;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      color: $white;
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &--success {
      box-shadow: 0 0 0 2px $success;
    }
    &--error {
      box-shadow: 0 0 0 2px $danger;
    }
  }

  // 操作按钮
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-3;
  }

  &__btn {
    padding: $spacing-3 $spacing-6;
    border: none;
    border-radius: $radius-lg;
    font-size: $font-size-base;
    font-weight: 500;
    cursor: pointer;
    transition: all $duration-normal $ease-out;

    &--primary {
      background: $primary-gradient;
      color: $white;
      box-shadow: 0 4px 20px rgba($primary-start, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba($primary-start, 0.4);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &--secondary {
      background: rgba(255, 255, 255, 0.1);
      color: $gray-200;
      border: 1px solid rgba(255, 255, 255, 0.2);
      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    &--ghost {
      background: transparent;
      color: $gray-400;
      &:hover {
        color: $white;
      }
    }
  }

  // 底部功能区
  &__bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-4;
  }

  // 工作流区域
  &__workflow {
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-5;

    &-header {
      display: flex;
      align-items: center;
      gap: $spacing-4;
      margin-bottom: $spacing-4;
    }

    &-icon {
      font-size: 32px;
    }

    &-info {
      h4 {
        color: $white;
        font-size: $font-size-base;
        font-weight: 600;
        margin: 0 0 $spacing-1;
      }
      p {
        color: $gray-400;
        font-size: $font-size-sm;
        margin: 0;
      }
    }
  }

  // 统计区域
  &__stats {
    background: $glass-bg;
    backdrop-filter: blur($glass-blur);
    border: 1px solid $glass-border;
    border-radius: $radius-xl;
    padding: $spacing-5;

    &-header {
      display: flex;
      align-items: center;
      gap: $spacing-3;
      margin-bottom: $spacing-4;

      h4 {
        color: $white;
        font-size: $font-size-base;
        font-weight: 600;
        margin: 0;
        flex: 1;
      }
    }

    &-icon {
      font-size: 24px;
    }

    &-refresh {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: $radius-md;
      color: $gray-400;
      cursor: pointer;
      transition: all $duration-normal;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: $white;
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .is-loading {
        animation: spin 1s linear infinite;
      }
    }

    &-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: $spacing-3;
      align-items: stretch;
    }
  }

  &__stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: $spacing-1;
    padding: $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-lg;
    min-height: 80px;

    &--total {
      background: rgba($primary-start, 0.1);
      border: 1px solid rgba($primary-start, 0.2);
    }
  }

  &__stat-value {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $white;
    text-align: center;
  }

  &__stat-label {
    font-size: $font-size-xs;
    color: $gray-400;
    text-align: center;
  }

  // 弹窗样式
  &__modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  &__modal {
    width: 100%;
    max-width: 420px;
    background: rgba(31, 41, 55, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: $radius-xl;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-5 $spacing-6;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      h3 {
        color: $white;
        font-size: $font-size-lg;
        font-weight: 600;
        margin: 0;
      }
    }

    &-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: $radius-md;
      color: $gray-400;
      font-size: 20px;
      cursor: pointer;
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        color: $white;
      }
    }

    &-body {
      padding: $spacing-6;
    }

    &-footer {
      display: flex;
      justify-content: flex-end;
      gap: $spacing-3;
      padding: $spacing-4 $spacing-6;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

  // 表单样式
  &__form-group {
    margin-bottom: $spacing-5;

    label {
      display: block;
      color: $gray-300;
      font-size: $font-size-sm;
      margin-bottom: $spacing-2;
    }
  }

  &__form-input {
    width: 100%;
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: $radius-lg;
    color: $white;
    font-size: $font-size-base;

    &::placeholder {
      color: $gray-500;
    }
    &:focus {
      outline: none;
      border-color: $primary-start;
      box-shadow: 0 0 0 3px rgba($primary-start, 0.2);
    }
  }

  &__form-value {
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border-radius: $radius-lg;
    color: $gray-300;
  }

  &__radio-group {
    display: flex;
    gap: $spacing-4;
  }

  &__radio {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    padding: $spacing-3 $spacing-4;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: $radius-lg;
    color: $gray-300;
    cursor: pointer;

    input {
      display: none;
    }

    &-dot {
      width: 16px;
      height: 16px;
      border: 2px solid $gray-500;
      border-radius: 50%;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        inset: 3px;
        background: $primary-start;
        border-radius: 50%;
        opacity: 0;
      }
    }

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &--active {
      border-color: $primary-start;
      background: rgba($primary-start, 0.1);
      color: $white;

      .upload-view__radio-dot {
        border-color: $primary-start;
        &::after {
          opacity: 1;
        }
      }
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// 动画
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  .upload-view__modal {
    transform: scale(0.9) translateY(20px);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Element Plus 树样式覆盖
:deep(.el-tree) {
  background: transparent;
  color: $gray-300;

  .el-tree-node__content {
    height: 36px;
    border-radius: $radius-md;
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .el-tree-node.is-current > .el-tree-node__content {
    background: rgba($primary-start, 0.2);
    color: $white;
  }

  .el-tree-node__expand-icon {
    color: $gray-500;
  }
}

// 响应式
@media (max-width: 1024px) {
  .upload-view {
    &__content {
      grid-template-columns: 1fr;
    }
    &__sidebar {
      position: static;
    }
    &__bottom {
      grid-template-columns: 1fr;
    }
    &__stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
</style>
