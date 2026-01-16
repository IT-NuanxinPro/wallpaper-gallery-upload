<template>
  <div class="result-card" :class="layoutClass">
    <!-- Desktop: 上下结构 -->
    <template v-if="result.primary === 'desktop'">
      <div class="desktop-layout">
        <div class="image-section">
          <img :src="result.imageUrl" :alt="result.imageName" />
          <div class="image-overlay">
            <el-tag :type="confidenceType" size="small" effect="dark">
              {{ (result.confidence * 100).toFixed(0) }}%
            </el-tag>
          </div>
        </div>
        <div class="info-section">
          <div v-if="result.promptTemplate !== 'filenameOnly'" class="category-row">
            <el-tag type="primary" effect="dark">{{ result.primary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="success" effect="dark">{{ result.secondary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="warning" effect="dark">{{ result.third }}</el-tag>
          </div>
          <div class="filename-section">
            <div class="section-label">文件名建议</div>
            <div class="filename-chips">
              <div
                v-for="(name, index) in result.filenameSuggestions"
                :key="index"
                class="filename-chip"
                :class="{ active: selectedFilename === name }"
                @click="selectFilename(name)"
              >
                <span class="filename-text">{{ name }}</span>
                <el-icon class="copy-icon" @click.stop="copyFilename(name)"
                  ><CopyDocument
                /></el-icon>
              </div>
            </div>
          </div>
          <div class="detail-row">
            <div class="description">
              <span class="label">描述</span>
              <span class="value">{{ result.description }}</span>
            </div>
            <div v-if="result.keywords.length" class="keywords">
              <el-tag v-for="kw in result.keywords" :key="kw" size="small" effect="plain">{{
                kw
              }}</el-tag>
            </div>
          </div>
          <div class="footer-section">
            <div class="meta-row">
              <div class="meta-item">
                <span class="meta-icon">🤖</span>
                <span class="meta-value model-name">{{ modelName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span class="meta-value">{{ formatTime(result.timestamp) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📊</span>
                <el-tag :type="confidenceType" size="small" effect="dark"
                  >{{ (result.confidence * 100).toFixed(0) }}%</el-tag
                >
              </div>
              <div class="meta-item">
                <span class="meta-icon">📁</span>
                <span class="meta-value">{{ formatSize(result.imageSize) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">🏷️</span>
                <span class="meta-value">{{ result.keywords?.length || 0 }} 标签</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📝</span>
                <span class="meta-value">{{ result.filenameSuggestions?.length || 0 }} 建议</span>
              </div>
            </div>
            <div class="action-row">
              <el-button size="small" type="primary" @click="copyPath">
                <el-icon><CopyDocument /></el-icon> 复制路径
              </el-button>
              <el-button size="small" @click="copyFullInfo">
                <el-icon><Document /></el-icon> 复制全部
              </el-button>
              <el-button size="small" text @click="showRaw = true"> 原始数据 </el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Mobile: 左右结构 -->
    <template v-else-if="result.primary === 'mobile'">
      <div class="mobile-layout">
        <div class="image-section">
          <img :src="result.imageUrl" :alt="result.imageName" />
          <el-tag :type="confidenceType" size="small" effect="dark" class="confidence-badge">
            {{ (result.confidence * 100).toFixed(0) }}%
          </el-tag>
        </div>
        <div class="info-section">
          <div v-if="result.promptTemplate !== 'filenameOnly'" class="category-row">
            <el-tag type="primary" size="small" effect="dark">{{ result.primary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="success" size="small" effect="dark">{{ result.secondary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="warning" size="small" effect="dark">{{ result.third }}</el-tag>
          </div>
          <div class="filename-section">
            <div class="section-label">文件名</div>
            <div class="filename-chips">
              <div
                v-for="(name, index) in result.filenameSuggestions"
                :key="index"
                class="filename-chip"
                :class="{ active: selectedFilename === name }"
                @click="selectFilename(name)"
              >
                <span class="filename-text">{{ name }}</span>
                <el-icon class="copy-icon" @click.stop="copyFilename(name)"
                  ><CopyDocument
                /></el-icon>
              </div>
            </div>
          </div>
          <div class="description-row">
            <span class="label">描述：</span>
            <span class="value">{{ result.description }}</span>
          </div>
          <div v-if="result.keywords.length" class="keywords-row">
            <span class="label">关键词：</span>
            <div class="keywords-list">
              <el-tag v-for="kw in result.keywords" :key="kw" size="small" effect="plain">{{
                kw
              }}</el-tag>
            </div>
          </div>
          <div class="footer-section">
            <div class="meta-row">
              <div class="meta-item">
                <span class="meta-icon">🤖</span>
                <span class="meta-value model-name">{{ modelName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span class="meta-value">{{ formatTime(result.timestamp) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📁</span>
                <span class="meta-value">{{ formatSize(result.imageSize) }}</span>
              </div>
            </div>
            <div class="action-row">
              <el-button size="small" type="primary" @click="copyPath">复制路径</el-button>
              <el-button size="small" @click="copyFullInfo">复制全部</el-button>
              <el-button size="small" text @click="showRaw = true">详情</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Avatar: 居中结构 -->
    <template v-else>
      <div class="avatar-layout">
        <div class="image-section">
          <img :src="result.imageUrl" :alt="result.imageName" />
          <el-tag :type="confidenceType" size="small" effect="dark" class="confidence-badge">
            {{ (result.confidence * 100).toFixed(0) }}%
          </el-tag>
        </div>
        <div class="info-section">
          <div v-if="result.promptTemplate !== 'filenameOnly'" class="category-row">
            <el-tag type="primary" size="small" effect="dark">{{ result.primary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="success" size="small" effect="dark">{{ result.secondary }}</el-tag>
            <span class="arrow">›</span>
            <el-tag type="warning" size="small" effect="dark">{{ result.third }}</el-tag>
          </div>
          <div class="filename-section">
            <div class="section-label centered">文件名</div>
            <div class="filename-chips centered">
              <div
                v-for="(name, index) in result.filenameSuggestions"
                :key="index"
                class="filename-chip"
                :class="{ active: selectedFilename === name }"
                @click="selectFilename(name)"
              >
                <span class="filename-text">{{ name }}</span>
                <el-icon class="copy-icon" @click.stop="copyFilename(name)"
                  ><CopyDocument
                /></el-icon>
              </div>
            </div>
          </div>
          <div class="description-row centered">
            <span class="label">描述：</span>
            <span class="value">{{ result.description }}</span>
          </div>
          <div v-if="result.keywords.length" class="keywords-row centered">
            <span class="label">关键词：</span>
            <div class="keywords-list">
              <el-tag v-for="kw in result.keywords" :key="kw" size="small" effect="plain">{{
                kw
              }}</el-tag>
            </div>
          </div>
          <div class="footer-section centered">
            <div class="meta-row">
              <div class="meta-item">
                <span class="meta-icon">🤖</span>
                <span class="meta-value model-name">{{ modelName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span class="meta-value">{{ formatTime(result.timestamp) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📁</span>
                <span class="meta-value">{{ formatSize(result.imageSize) }}</span>
              </div>
            </div>
            <div class="action-row">
              <el-button size="small" type="primary" @click="copyPath">复制路径</el-button>
              <el-button size="small" @click="copyFullInfo">复制全部</el-button>
              <el-button size="small" text @click="showRaw = true">原始数据</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <el-dialog v-model="showRaw" title="原始 AI 响应" width="70%">
      <pre class="raw-data">{{ JSON.stringify(result.raw, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Document } from '@element-plus/icons-vue'
import { getModelByKey } from '@/config/ai-config'

const props = defineProps({
  result: { type: Object, required: true }
})

const selectedFilename = ref(props.result.selectedFilename || props.result.filenameSuggestions[0])
const showRaw = ref(false)

const layoutClass = computed(() => `layout-${props.result.primary}`)
const confidenceType = computed(() => {
  const c = props.result.confidence
  if (c >= 0.8) return 'success'
  if (c >= 0.6) return 'warning'
  return 'danger'
})

const modelName = computed(() => {
  const modelConfig = getModelByKey(props.result.model)
  return modelConfig?.name || props.result.model || '未知模型'
})

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-CN')
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function selectFilename(name) {
  selectedFilename.value = name
}

function copyFilename(name) {
  navigator.clipboard.writeText(name)
  ElMessage.success(`已复制: ${name}`)
}

function copyPath() {
  const path = `${props.result.primary}/${props.result.secondary}/${props.result.third}/${selectedFilename.value}`
  navigator.clipboard.writeText(path)
  ElMessage.success('路径已复制')
}

function copyFullInfo() {
  const info = `分类: ${props.result.primary}/${props.result.secondary}/${props.result.third}
文件名: ${selectedFilename.value}
描述: ${props.result.description}
关键词: ${props.result.keywords.join(', ')}
置信度: ${(props.result.confidence * 100).toFixed(0)}%`
  navigator.clipboard.writeText(info)
  ElMessage.success('全部信息已复制')
}
</script>

<style lang="scss" scoped>
.result-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: visible;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  .arrow {
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
  }
}

.section-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;

  &.centered {
    text-align: center;
  }
}

.filename-section {
  .filename-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    &.centered {
      justify-content: center;
    }
  }
  .filename-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(102, 126, 234, 0.5);
    }
    &.active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
      border-color: #667eea;
    }
    .filename-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      font-family: 'Monaco', 'Consolas', monospace;
    }
    .copy-icon {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      &:hover {
        color: #667eea;
      }
    }
  }
}

.description-row,
.detail-row .description {
  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-right: 6px;
    flex-shrink: 0;
  }
  .value {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
  }
  &.centered {
    text-align: center;
  }
}

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;

  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-right: 6px;
    flex-shrink: 0;
    line-height: 22px;
  }

  .keywords-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
  }

  &.centered {
    justify-content: center;
  }
  .el-tag {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }
}

.spacer {
  flex: 1;
  min-height: 8px;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  &.centered {
    justify-content: center;
    gap: 12px;
  }
  .meta {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
}

.footer-section {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.centered {
    align-items: center;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    align-items: center;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .meta-icon {
      font-size: 12px;
    }

    .meta-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }

    .meta-value {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);

      &.model-name {
        font-weight: 500;
        color: #667eea;
      }
    }
  }

  .action-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

// Desktop: 上下结构
.desktop-layout {
  .image-section {
    position: relative;
    width: 100%;
    max-height: 200px;
    overflow: hidden;
    img {
      width: 100%;
      height: auto;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .image-overlay {
      position: absolute;
      top: 12px;
      right: 12px;
    }
  }
  .info-section {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    .description {
      flex: 1;
    }
    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-width: 40%;
    }
  }
}

// Mobile: 左右结构
.mobile-layout {
  display: flex;
  gap: 16px;
  padding: 16px;

  .image-section {
    position: relative;
    flex-shrink: 0;
    width: 140px;
    height: 280px;
    border-radius: 12px;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .confidence-badge {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
  .info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
}

// Avatar: 居中结构
.avatar-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  gap: 16px;
  .image-section {
    position: relative;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(255, 255, 255, 0.15);
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .confidence-badge {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
    }
  }
  .info-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .category-row {
    justify-content: center;
  }
}

.raw-data {
  padding: 16px;
  background: #1a1a2e;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 500px;
  margin: 0;
  color: #e0e0e0;
}
</style>
