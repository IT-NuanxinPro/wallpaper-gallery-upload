/**
 * AI 图片分类和命名服务
 * 使用 Cloudflare Workers AI 进行图片分析
 */

/**
 * 分析图片并生成分类和文件名建议
 * @param {File} file - 图片文件
 * @param {string} aiToken - Cloudflare AI Token
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeImage(file, aiToken) {
  try {
    // 1. 读取图片为 base64
    const imageBase64 = await fileToBase64(file)

    // 2. 调用 Cloudflare Workers AI
    const analysis = await callCloudflareAI(imageBase64, aiToken)

    // 3. 生成建议
    return {
      // 文件名建议（3个选项）
      filenameSuggestions: generateFilenames(analysis),

      // 分类建议
      categorySuggestion: {
        primary: analysis.primaryCategory, // desktop/mobile/avatar
        secondary: analysis.secondaryCategory, // 二级分类
        confidence: analysis.confidence // 置信度
      },

      // 图片描述
      description: analysis.description,

      // 标签
      tags: analysis.tags,

      // 原始分析结果
      raw: analysis
    }
  } catch (error) {
    console.error('AI 分析失败:', error)
    throw error
  }
}

/**
 * 调用 Cloudflare Workers AI API
 */
async function callCloudflareAI(imageBase64, aiToken) {
  // 方案 1: 使用 Cloudflare Workers AI（推荐）
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run/@cf/llava-hf/llava-1.5-7b-hf',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt: `分析这张图片，请回答以下问题：
1. 这张图片最适合作为什么类型的壁纸？（桌面壁纸/手机壁纸/头像）
2. 图片的主题是什么？（动漫/风景/游戏/科技/艺术/真人/卡通/其他）
3. 用3-5个词描述图片的主要内容
4. 建议一个简短的英文文件名（不超过30个字符，使用连字符分隔）

请用JSON格式回答：
{
  "type": "desktop|mobile|avatar",
  "theme": "分类名称",
  "keywords": ["关键词1", "关键词2"],
  "filename": "建议的文件名",
  "description": "图片描述"
}`
      })
    }
  )

  if (!response.ok) {
    throw new Error(`AI API 调用失败: ${response.statusText}`)
  }

  const result = await response.json()

  // 解析 AI 返回的结果
  return parseAIResponse(result)
}

/**
 * 解析 AI 返回结果
 */
function parseAIResponse(aiResult) {
  try {
    // 从 AI 返回中提取 JSON
    const jsonMatch = aiResult.response.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch[0])

    return {
      primaryCategory: parsed.type,
      secondaryCategory: parsed.theme,
      description: parsed.description,
      tags: parsed.keywords,
      suggestedFilename: parsed.filename,
      confidence: 0.85 // 可以根据 AI 返回调整
    }
  } catch (error) {
    console.error('解析 AI 结果失败:', error)
    // 返回默认值
    return {
      primaryCategory: 'desktop',
      secondaryCategory: '其他',
      description: '无法识别',
      tags: [],
      suggestedFilename: 'wallpaper',
      confidence: 0.5
    }
  }
}

/**
 * 生成文件名建议（3个选项）
 */
function generateFilenames(analysis) {
  const base = analysis.suggestedFilename || 'wallpaper'
  const timestamp = Date.now()

  return [
    // 选项1: AI 建议的文件名
    `${base}.jpg`,

    // 选项2: 文件名 + 时间戳
    `${base}-${timestamp}.jpg`,

    // 选项3: 分类 + 关键词
    `${analysis.secondaryCategory}-${analysis.tags[0] || 'image'}.jpg`
  ]
}

/**
 * 将文件转换为 base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // 移除 data:image/xxx;base64, 前缀
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 批量分析图片
 */
export async function analyzeBatch(files, aiToken, onProgress) {
  const results = []

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await analyzeImage(files[i], aiToken)
      results.push({
        file: files[i],
        analysis: result,
        success: true
      })
    } catch (error) {
      results.push({
        file: files[i],
        error: error.message,
        success: false
      })
    }

    // 进度回调
    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }

  return results
}
