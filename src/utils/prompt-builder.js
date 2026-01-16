import { PROMPT_TEMPLATES, replaceVariables } from '@/config/ai-prompts'
import { CATEGORIES } from '@/config/categories'
import { getThirdLevelCategories } from '@/config/subcategories'

const SPECIALIZED_TEMPLATES = {
  desktop: `分析这张图片，返回JSON格式的分类结果。

主分类：{{primaryCategory}}

可选的二级分类：{{secondaryList}}

三级分类选项：
{{thirdHints}}

规则：
1. 二级分类：从上面列表中选择最匹配的
2. 三级分类：优先选择具体风格，避免选"通用"
   - 人像：根据风格选"氛围感"、"清新"、"魅力"等
   - 动漫：能识别作品选作品名，否则选"二次元"
   - 风景：选"城市"、"天空"、"海滨"等具体场景
3. 文件名：中文，15-25字，描述图片主要特征
4. 关键词：3-5个中文词
5. 描述：一句话描述图片

返回JSON（不要其他内容）：
{
  "secondary": "二级分类名称",
  "third": "三级分类名称",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "filename": "具体的中文文件名",
  "description": "图片描述"
}`,
  mobile: `分析这张图片，返回JSON格式的分类结果。

主分类：{{primaryCategory}}

可选的二级分类：{{secondaryList}}

三级分类选项：
{{thirdHints}}

规则：
1. 二级分类：从上面列表中选择最匹配的
2. 三级分类：优先选择具体风格，避免选"通用"
   - 人像：根据风格选"氛围感"、"清新"、"魅力"等
   - 动漫：能识别作品选作品名，否则选"二次元"
   - 风景：选"城市"、"天空"、"海滨"等具体场景
3. 文件名：中文，15-25字，描述图片主要特征
4. 关键词：3-5个中文词
5. 描述：一句话描述图片

返回JSON（不要其他内容）：
{
  "secondary": "二级分类名称",
  "third": "三级分类名称",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "filename": "具体的中文文件名",
  "description": "图片描述"
}`,
  avatar: `分析这张图片，返回JSON格式的分类结果。

主分类：{{primaryCategory}}

可选的二级分类：{{secondaryList}}

三级分类选项：
{{thirdHints}}

规则：
1. 二级分类：从上面列表中选择最匹配的
2. 三级分类：优先选择具体风格，避免选"通用"
   - 人像：根据风格选"氛围感"、"清新"、"魅力"等
   - 动漫：能识别作品选作品名，否则选"二次元"
   - 风景：选"城市"、"天空"、"海滨"等具体场景
3. 文件名：中文，15-25字，描述图片主要特征
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
}

export function buildPrompt(templateId, primaryCategory, customPrompt = '') {
  if (templateId === 'custom') {
    return customPrompt
  }

  if (templateId === 'default') {
    const specialTemplate = SPECIALIZED_TEMPLATES[primaryCategory]
    if (specialTemplate) {
      const variables = buildVariables(primaryCategory)
      return replaceVariables(specialTemplate, variables)
    }
  }

  const template = PROMPT_TEMPLATES[templateId]
  if (!template) {
    throw new Error(`未找到模板: ${templateId}`)
  }

  if (!template.variables || template.variables.length === 0) {
    return template.template
  }

  const variables = buildVariables(primaryCategory)
  return replaceVariables(template.template, variables)
}

export function buildVariables(primaryCategory) {
  const secondaryCategories = CATEGORIES[primaryCategory]?.subcategories || []
  const secondaryList = secondaryCategories.map(cat => cat.value).join('、')

  let thirdHints = ''
  secondaryCategories.forEach(cat => {
    const thirdList = getThirdLevelCategories(primaryCategory, cat.value)
    thirdHints += `如果选择"${cat.value}"，则从这些子分类中选择：${thirdList.join('、')}\n`
  })

  return {
    primaryCategory,
    secondaryList,
    thirdHints
  }
}

export function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return false
  }

  if (prompt.trim().length < 10) {
    return false
  }

  return true
}

export function previewPrompt(templateId, primaryCategory, customPrompt = '') {
  try {
    const prompt = buildPrompt(templateId, primaryCategory, customPrompt)
    const isValid = validatePrompt(prompt)

    return {
      success: true,
      prompt,
      isValid,
      length: prompt.length,
      lines: prompt.split('\n').length
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
