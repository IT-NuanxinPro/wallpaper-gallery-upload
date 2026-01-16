/**
 * 壁纸分类配置
 * 与图床仓库的目录结构保持一致
 */

export const CATEGORIES = {
  desktop: {
    name: 'Desktop（桌面壁纸）',
    description: '横向构图，适合电脑屏幕，宽高比接近 16:9 或 16:10',
    subcategories: [
      { value: '插画', label: '插画', description: '艺术插画、手绘风格' },
      { value: '动漫', label: '动漫', description: '动漫角色、二次元风格' },
      { value: '风景', label: '风景', description: '自然风光、城市景观' },
      { value: '萌宠', label: '萌宠', description: '可爱动物、宠物' },
      { value: '人像', label: '人像', description: '真人照片、人物摄影' },
      { value: '影视', label: '影视', description: '电影、电视剧相关' },
      { value: '游戏', label: '游戏', description: '游戏截图、游戏角色' },
      { value: '政治', label: '政治', description: '政治人物、国家元首' },
      { value: 'IP形象', label: 'IP形象', description: '品牌IP、卡通形象' }
    ]
  },
  mobile: {
    name: 'Mobile（手机壁纸）',
    description: '竖向构图，适合手机屏幕，宽高比接近 9:16',
    subcategories: [
      { value: '插画', label: '插画', description: '艺术插画、手绘风格' },
      { value: '创意', label: '创意', description: '创意设计、抽象艺术' },
      { value: '动漫', label: '动漫', description: '动漫角色、二次元风格' },
      { value: '风景', label: '风景', description: '自然风光、城市景观' },
      { value: '萌宠', label: '萌宠', description: '可爱动物、宠物' },
      { value: '人像', label: '人像', description: '真人照片、人物摄影' },
      { value: '影视', label: '影视', description: '电影、电视剧相关' },
      { value: 'IP形象', label: 'IP形象', description: '品牌IP、卡通形象' }
    ]
  },
  avatar: {
    name: 'Avatar（头像）',
    description: '正方形或接近正方形，适合作为头像使用',
    subcategories: [
      { value: '表情包', label: '表情包', description: '搞笑表情、meme图' },
      { value: '插画', label: '插画', description: '艺术插画风格头像' },
      { value: '动漫', label: '动漫', description: '动漫角色头像' },
      { value: '萌宠', label: '萌宠', description: '动物头像' },
      { value: '人像', label: '人像', description: '真人头像' },
      { value: 'IP形象', label: 'IP形象', description: '品牌IP、卡通形象头像' }
    ]
  }
}

/**
 * 获取所有主分类
 */
export function getPrimaryCategories() {
  return Object.keys(CATEGORIES)
}

/**
 * 获取指定主分类的二级分类
 */
export function getSubcategories(primaryCategory) {
  return CATEGORIES[primaryCategory]?.subcategories || []
}

/**
 * 获取二级分类的简单列表（只有值）
 */
export function getSubcategoryValues(primaryCategory) {
  return getSubcategories(primaryCategory).map(cat => cat.value)
}

/**
 * 生成 AI Prompt 的分类说明
 */
export function generateCategoryPrompt() {
  let prompt = '【第一步：判断壁纸类型】\n'

  Object.entries(CATEGORIES).forEach(([key, config]) => {
    prompt += `- ${key}（${config.name}）：${config.description}\n`
  })

  prompt += '\n【第二步：选择二级分类】\n'
  prompt += '必须从以下现有分类中选择一个最匹配的：\n\n'

  Object.entries(CATEGORIES).forEach(([key, config]) => {
    prompt += `如果是 ${key}（${config.name}），从这些分类中选择：\n`
    config.subcategories.forEach(sub => {
      prompt += `- ${sub.value}：${sub.description}\n`
    })
    prompt += '\n'
  })

  return prompt
}

/**
 * 验证分类是否有效
 */
export function isValidCategory(primaryCategory, secondaryCategory) {
  const subcategories = getSubcategoryValues(primaryCategory)
  return subcategories.includes(secondaryCategory)
}
