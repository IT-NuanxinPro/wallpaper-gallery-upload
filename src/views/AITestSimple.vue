<template>
  <div class="ai-test-view">
    <div class="test-container">
      <h1 class="title">🤖 AI 图片分类测试（简化版）</h1>
      <p class="subtitle">你选择主分类，AI 识别二级和三级分类</p>

      <!-- 配置 -->
      <el-card class="config-card" shadow="hover">
        <template #header>⚙️ Cloudflare AI 配置</template>

        <!-- Worker 部署提示 -->
        <el-alert
          title="📌 首次使用请先部署 Worker"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <div style="line-height: 1.8">
              <p style="margin: 0 0 8px 0">
                1. 运行命令：<code style="background: #f5f5f5; padding: 2px 8px; border-radius: 4px"
                  >wrangler deploy</code
                >
              </p>
              <p style="margin: 0 0 8px 0">2. 获取 Worker URL 并在代码中替换</p>
              <p style="margin: 0">3. 详细步骤请查看 <strong>WORKER-DEPLOY.md</strong></p>
            </div>
          </template>
        </el-alert>

        <el-form label-width="140px">
          <el-form-item label="Account ID">
            <el-input v-model="config.accountId" placeholder="输入 Account ID" clearable />
          </el-form-item>
          <el-form-item label="AI Token">
            <el-input
              v-model="config.aiToken"
              type="password"
              placeholder="输入 AI Token"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
            <el-button @click="loadConfig">加载配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 主分类选择 -->
      <el-card class="category-card" shadow="hover">
        <template #header>1️⃣ 选择壁纸类型（你自己知道）</template>
        <el-radio-group v-model="primaryCategory" size="large">
          <el-radio-button value="desktop">🖥️ Desktop</el-radio-button>
          <el-radio-button value="mobile">📱 Mobile</el-radio-button>
          <el-radio-button value="avatar">👤 Avatar</el-radio-button>
        </el-radio-group>
      </el-card>

      <!-- 上传图片 -->
      <el-card class="upload-card" shadow="hover">
        <template #header>2️⃣ 上传图片让 AI 分析</template>

        <el-alert title="💡 图片要求" type="info" :closable="false" style="margin-bottom: 16px">
          <div style="font-size: 14px; line-height: 1.6">
            • 支持格式：JPG、PNG、WEBP<br />
            • 建议大小：&lt; 5MB（会自动压缩到 1024px）<br />
            • 图片会自动转换为 JPEG 格式以提高兼容性
          </div>
        </el-alert>

        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          accept="image/*"
          :on-change="handleFileChange"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">拖拽图片到这里，或点击选择</div>
        </el-upload>

        <div v-if="selectedFile" class="file-info">
          <el-tag type="success" size="large">{{ selectedFile.name }}</el-tag>
          <el-tag type="primary" size="large">{{ primaryCategory }}</el-tag>
          <el-button
            type="primary"
            size="large"
            :loading="analyzing"
            :disabled="!config.accountId || !config.aiToken"
            @click="startAnalysis"
          >
            {{ analyzing ? '分析中...' : '🚀 开始分析' }}
          </el-button>
        </div>
      </el-card>

      <!-- 分析进度 -->
      <el-card v-if="analyzing" class="progress-card" shadow="hover">
        <div class="analyzing-content">
          <el-progress type="circle" :percentage="progress" :width="120" />
          <p class="analyzing-text">AI 正在分析...</p>
        </div>
      </el-card>

      <!-- 分析结果 -->
      <el-card v-if="result && !analyzing" class="result-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>✨ 分析结果</span>
            <el-tag :type="result.confidence >= 0.8 ? 'success' : 'warning'" size="small">
              置信度: {{ (result.confidence * 100).toFixed(0) }}%
            </el-tag>
          </div>
        </template>

        <div class="result-content">
          <!-- 图片预览 -->
          <div class="preview-section">
            <img :src="imagePreview" alt="预览" />
          </div>

          <!-- 分析详情 -->
          <div class="details-section">
            <!-- 完整路径 -->
            <div class="detail-item">
              <h3>📁 完整分类路径</h3>
              <div class="category-path">
                <el-tag type="primary" size="large" effect="dark">{{ primaryCategory }}</el-tag>
                <el-icon><ArrowRight /></el-icon>
                <el-tag type="success" size="large" effect="dark">{{ result.secondary }}</el-tag>
                <el-icon><ArrowRight /></el-icon>
                <el-tag type="warning" size="large" effect="dark">{{ result.third }}</el-tag>
              </div>
              <el-text type="info" size="small" style="margin-top: 12px; display: block">
                完整路径: {{ primaryCategory }}/{{ result.secondary }}/{{ result.third }}
              </el-text>
            </div>

            <!-- 文件名建议 -->
            <div class="detail-item">
              <h3>📝 文件名建议</h3>
              <div class="filename-list">
                <el-tag
                  v-for="(name, index) in result.filenameSuggestions"
                  :key="index"
                  size="large"
                  :type="index === 0 ? 'primary' : ''"
                  class="filename-tag"
                >
                  {{ name }}
                </el-tag>
              </div>
            </div>

            <!-- 图片描述 -->
            <div class="detail-item">
              <h3>🎨 图片描述</h3>
              <div class="description-box">{{ result.description }}</div>
            </div>

            <!-- 关键词 -->
            <div class="detail-item">
              <h3>🏷️ 关键词</h3>
              <div class="tags-list">
                <el-tag
                  v-for="tag in result.keywords"
                  :key="tag"
                  type="info"
                  effect="plain"
                  class="tag-item"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>

            <!-- 原始响应 -->
            <div class="detail-item">
              <h3>🔍 原始 AI 响应</h3>
              <el-collapse>
                <el-collapse-item title="查看详细数据" name="1">
                  <pre class="raw-response">{{ JSON.stringify(result.raw, null, 2) }}</pre>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 错误提示 -->
      <el-card v-if="error" class="error-card" shadow="hover">
        <el-result icon="error" title="分析失败" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="startAnalysis">重新分析</el-button>
          </template>
        </el-result>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, ArrowRight } from '@element-plus/icons-vue'
import { CATEGORIES } from '@/config/categories'
import { getThirdLevelCategories } from '@/config/subcategories'

// 配置
const config = ref({
  accountId: '',
  aiToken: ''
})

// 状态
const primaryCategory = ref('desktop')
const selectedFile = ref(null)
const analyzing = ref(false)
const progress = ref(0)
const result = ref(null)
const error = ref(null)
const imagePreview = ref('')

// 保存/加载配置
function saveConfig() {
  localStorage.setItem('ai_test_config', JSON.stringify(config.value))
  ElMessage.success('配置已保存')
}

function loadConfig() {
  const saved = localStorage.getItem('ai_test_config')
  if (saved) {
    config.value = JSON.parse(saved)
    ElMessage.success('配置已加载')
  }
}

// 自动加载
loadConfig()

// 文件选择
function handleFileChange(file) {
  selectedFile.value = file.raw
  imagePreview.value = URL.createObjectURL(file.raw)
  result.value = null
  error.value = null
}

// 开始分析
async function startAnalysis() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择图片')
    return
  }

  analyzing.value = true
  progress.value = 0
  error.value = null
  result.value = null

  const progressInterval = setInterval(() => {
    if (progress.value < 90) progress.value += 10
  }, 300)

  try {
    const base64 = await fileToBase64(selectedFile.value)
    const aiResult = await callAI(base64)

    clearInterval(progressInterval)
    progress.value = 100

    result.value = aiResult

    setTimeout(() => {
      analyzing.value = false
      ElMessage.success('分析完成！')
    }, 500)
  } catch (err) {
    clearInterval(progressInterval)
    analyzing.value = false
    error.value = err.message
    ElMessage.error(error.value)
  }
}

// 调用 AI（通过 Worker 代理）
async function callAI(imageBase64) {
  // 🚀 使用 Cloudflare Worker 代理
  const workerUrl = 'https://ai-proxy.han1569250882.workers.dev'

  // 获取二级分类列表
  const secondaryCategories = CATEGORIES[primaryCategory.value]?.subcategories || []
  const secondaryList = secondaryCategories.map(cat => cat.value).join('、')

  // 生成三级分类提示
  let thirdHints = ''
  secondaryCategories.forEach(cat => {
    const thirdList = getThirdLevelCategories(primaryCategory.value, cat.value)
    thirdHints += `\n如果选择"${cat.value}"，则从这些子分类中选择：${thirdList.join('、')}`
  })

  const prompt = `分析这张图片，返回JSON格式的分类结果。

主分类：${primaryCategory.value}

可选的二级分类：${secondaryList}

三级分类选项：
${thirdHints}

规则：
1. 二级分类：从上面列表中选择最匹配的
2. 三级分类：优先选择具体风格，避免选"通用"
   - 人像：根据风格选"氛围感"、"清新"、"魅力"等
   - 动漫：能识别作品选作品名，否则选"二次元"
   - 风景：选"城市"、"天空"、"海滨"等具体场景
3. 文件名：中文，10-20字，描述图片主要特征
4. 关键词：3-5个中文词
5. 描述：一句话描述图片

返回JSON（不要其他内容）：
{
  "secondary": "二级分类名称",
  "third": "三级分类名称",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "filename": "具体的中文文件名",
  "description": "图片描述"
}`

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountId: config.value.accountId,
      aiToken: config.value.aiToken,
      image: imageBase64.split(',')[1],
      prompt: prompt
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))

    // 处理特定错误
    if (errorData.errors && errorData.errors[0]) {
      const error = errorData.errors[0]
      if (error.code === 3016) {
        throw new Error(
          '图片解码失败，请尝试：1) 使用 JPG/PNG 格式 2) 确保图片未损坏 3) 尝试其他图片'
        )
      }
      throw new Error(`AI 错误 (${error.code}): ${error.message}`)
    }

    throw new Error(errorData.error || `Worker 请求失败: ${response.status}`)
  }

  const data = await response.json()

  // 检查是否有错误
  if (data.error) {
    throw new Error(data.message || data.error)
  }

  if (data.errors && data.errors.length > 0) {
    const error = data.errors[0]
    if (error.code === 3016) {
      throw new Error(
        '图片解码失败，请尝试：1) 使用 JPG/PNG 格式 2) 确保图片未损坏 3) 尝试其他图片'
      )
    }
    throw new Error(`AI 错误: ${error.message}`)
  }

  return parseResult(data)
}

// 解析结果
function parseResult(apiResponse) {
  try {
    // Llama Vision 返回格式：result.response (可能是字符串或对象)
    let responseData = apiResponse.result?.response

    // 如果 response 已经是对象，直接使用
    if (typeof responseData === 'object' && responseData !== null) {
      const parsed = responseData
      const baseFilename = parsed.filename || '壁纸'
      const timestamp = Date.now().toString().slice(-6)

      return {
        secondary: parsed.secondary || '通用',
        third: parsed.third || '通用',
        filenameSuggestions: [
          `${baseFilename}.jpg`,
          `${baseFilename}-${timestamp}.jpg`,
          `${parsed.secondary}-${parsed.keywords?.[0] || '图片'}.jpg`
        ],
        description: parsed.description || '无描述',
        keywords: parsed.keywords || [],
        confidence: 0.9, // Llama Vision 更准确
        raw: apiResponse
      }
    }

    // 如果是字符串，尝试提取 JSON
    const responseText = String(responseData || apiResponse.result?.description || '')
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI 返回格式不正确，未找到 JSON 数据')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const baseFilename = parsed.filename || '壁纸'
    const timestamp = Date.now().toString().slice(-6)

    return {
      secondary: parsed.secondary || '通用',
      third: parsed.third || '通用',
      filenameSuggestions: [
        `${baseFilename}.jpg`,
        `${baseFilename}-${timestamp}.jpg`,
        `${parsed.secondary}-${parsed.keywords?.[0] || '图片'}.jpg`
      ],
      description: parsed.description || '无描述',
      keywords: parsed.keywords || [],
      confidence: 0.9,
      raw: apiResponse
    }
  } catch (err) {
    throw new Error(`解析失败: ${err.message}`)
  }
}

// 文件转 base64（带图片压缩）
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      reject(new Error('请上传图片文件'))
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      // eslint-disable-next-line no-undef
      const img = new Image()
      img.onload = () => {
        // 创建 canvas 进行压缩
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // 限制最大尺寸为 1024px
        let width = img.width
        let height = img.height
        const maxSize = 1024

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 JPEG 格式，质量 0.8
        const base64 = canvas.toDataURL('image/jpeg', 0.8)
        resolve(base64)
      }

      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}
</script>

<style lang="scss" scoped>
.ai-test-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.test-container {
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  font-size: 48px;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 40px;
}

.config-card,
.category-card,
.upload-card,
.progress-card,
.result-card,
.error-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 18px;
  font-weight: 600;
}

.upload-icon {
  font-size: 80px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: var(--el-text-color-regular);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.analyzing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;

  .analyzing-text {
    margin-top: 24px;
    font-size: 18px;
    font-weight: 500;
  }
}

.result-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 32px;

  .preview-section img {
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .details-section {
    .detail-item {
      margin-bottom: 32px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
      }
    }

    .category-path {
      display: flex;
      align-items: center;
      gap: 16px;

      .el-icon {
        font-size: 20px;
        color: var(--el-text-color-secondary);
      }
    }

    .filename-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .filename-tag {
        padding: 12px 16px;
        font-size: 14px;
        font-family: 'Monaco', 'Courier New', monospace;
      }
    }

    .description-box {
      padding: 16px;
      background: var(--el-fill-color-light);
      border-radius: 8px;
      line-height: 1.8;
      font-size: 15px;
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;

      .tag-item {
        padding: 8px 16px;
        font-size: 14px;
      }
    }

    .raw-response {
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
      max-height: 400px;
    }
  }
}

@media (max-width: 768px) {
  .result-content {
    grid-template-columns: 1fr;
  }
}
</style>
