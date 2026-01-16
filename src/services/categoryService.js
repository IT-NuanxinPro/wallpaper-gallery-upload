/**
 * 分类服务
 * 从 GitHub 仓库实时获取分类目录结构
 */

import { githubService } from './github'

// 分类描述映射（根据分类名称自动生成描述）
const CATEGORY_DESCRIPTIONS = {
  // 二级分类描述
  插画: '艺术插画、手绘风格、创意绘画',
  动漫: '动漫角色、二次元风格、日漫美漫',
  风景: '自然风光、城市景观、山水美景',
  萌宠: '可爱动物、宠物萌图、动物摄影',
  人像: '真人照片、人物摄影、写真美图',
  影视: '电影剧照、电视剧截图、影视海报',
  游戏: '游戏截图、游戏角色、游戏海报',
  政治: '政治人物、国家元首、历史人物',
  IP形象: '品牌IP、卡通形象、吉祥物',
  创意: '创意设计、抽象艺术、概念图',
  表情包: '搞笑表情、meme图、趣味图片',

  // 三级分类描述 - 动漫
  二次元: '通用动漫风格，无法识别具体作品时选择',
  通用: '无法识别具体类型时选择此项',
  鬼灭之刃: '《鬼灭之刃》动漫作品相关',
  蜡笔小新: '《蜡笔小新》动漫作品相关',
  斗破苍穹: '《斗破苍穹》动漫作品相关',
  名侦探柯南: '《名侦探柯南》动漫作品相关',
  神奇宝贝: '《宝可梦/神奇宝贝》系列相关',
  初音未来: 'VOCALOID虚拟歌手初音未来相关',
  间谍过家家: '《间谍过家家》动漫作品相关',
  刀剑神域: '《刀剑神域》动漫作品相关',
  进击的巨人: '《进击的巨人》动漫作品相关',
  仙逆: '《仙逆》动漫作品相关',
  剑来: '《剑来》动漫作品相关',
  完美世界: '《完美世界》动漫作品相关',
  百炼成神: '《百炼成神》动漫作品相关',
  小埋: '《干物妹小埋》动漫作品相关',
  蕾姆: '《Re:从零开始》蕾姆角色相关',
  春物雪乃: '《春物》雪之下雪乃角色相关',
  紫罗兰永恒花园: '《紫罗兰永恒花园》动漫作品相关',
  罪恶王冠: '《罪恶王冠》动漫作品相关',
  新世纪福音战士: '《EVA/新世纪福音战士》相关',
  哆啦A梦: '《哆啦A梦》动漫作品相关',
  喜洋洋与灰太狼: '《喜羊羊与灰太狼》动漫作品相关',
  喜羊羊与灰太狼: '《喜羊羊与灰太狼》动漫作品相关',
  猫和老鼠: '《猫和老鼠》动漫作品相关',
  海贼王: '《海贼王/ONE PIECE》动漫作品相关',
  你的名字: '《你的名字》新海诚电影相关',
  夏目友人帐: '《夏目友人帐》动漫作品相关',
  日漫: '日本动漫通用风格',
  天线宝宝: '《天线宝宝》动画相关',
  樱桃小丸子: '《樱桃小丸子》动漫作品相关',

  // 三级分类描述 - 游戏
  原神: '《原神》游戏相关',
  崩坏: '《崩坏》系列游戏相关',
  艾尔登法环: '《艾尔登法环》游戏相关',
  英雄联盟: '《英雄联盟》游戏相关',

  // 三级分类描述 - 风景
  城市: '城市风光、都市景观、建筑群',
  天空: '天空云彩、日出日落、蓝天白云',
  建筑: '建筑摄影、古建筑、现代建筑',
  日落: '日落黄昏、夕阳美景',
  星空: '星空银河、夜空星辰',
  海滨: '海边风光、沙滩海浪',
  湖泊: '湖泊风光、水面倒影',
  花卉: '花卉植物、花园美景',
  雪山: '雪山冰川、冬季风光',
  冬日雪景: '冬季雪景、雪地风光',
  森林: '森林树木、绿色自然',

  // 三级分类描述 - 萌宠
  猫咪: '猫咪萌图、喵星人',
  狗狗: '狗狗萌图、汪星人',
  兔兔: '兔子萌图、小兔子',

  // 三级分类描述 - 人像
  国风: '中国风、古风、传统文化',
  古装: '古装写真、汉服、传统服饰',
  明星: '明星艺人、偶像照片',
  氛围感: '氛围感人像、情绪摄影',
  清新: '清新风格、小清新',
  魅力: '魅力人像、时尚摄影',
  日系: '日系风格、日式写真',
  背影: '背影照片、背影人像',
  甜妹: '甜美风格、可爱女生',
  卡通简笔画: '卡通简笔画风格人像',
  张凌赫: '演员张凌赫相关',
  迪丽热巴: '演员迪丽热巴相关',
  王楚然: '演员王楚然相关',
  易烊千玺: '艺人易烊千玺相关',

  // 三级分类描述 - 影视
  海绵宝宝: '《海绵宝宝》动画相关',
  疯狂动物城: '《疯狂动物城》电影相关',
  柯南: '《名侦探柯南》影视相关',
  漫威: '漫威电影宇宙相关',

  // 三级分类描述 - 插画
  卡通: '卡通风格插画',
  场景: '场景插画、背景图',
  文字: '文字设计、字体艺术',
  风景插画: '风景插画、自然场景',
  少女与猫: '少女与猫主题插画',

  // 三级分类描述 - IP形象
  乌萨奇: '乌萨奇IP形象',
  凯蒂猫: 'Hello Kitty凯蒂猫',
  'Hello Kitty': 'Hello Kitty凯蒂猫',
  水豚噜噜: '水豚噜噜IP形象',
  粉红兔: '粉红兔IP形象',
  线条小狗: '线条小狗IP形象',
  库洛米: '库洛米IP形象',
  '牛牛黎深&噜噜': '牛牛黎深和噜噜IP形象',
  小八: '小八IP形象',
  小熊: '小熊IP形象',
  卡通角色: '通用卡通角色',

  // 三级分类描述 - 创意
  抽象: '抽象艺术、抽象设计',
  几何: '几何图形、几何设计',
  渐变: '渐变色彩、渐变背景',
  极简: '极简风格、简约设计',
  爱国主题: '爱国主题、国旗国徽',

  // 三级分类描述 - 表情包
  搞笑: '搞笑表情包、幽默图片',
  搞怪: '搞怪表情包、趣味图片',
  可爱: '可爱表情包、萌系图片',
  meme: 'meme梗图、网络流行图'
}

// 主分类描述
const PRIMARY_DESCRIPTIONS = {
  desktop: '横向构图，适合电脑屏幕，宽高比接近 16:9 或 16:10',
  mobile: '竖向构图，适合手机屏幕，宽高比接近 9:16',
  avatar: '正方形或接近正方形，适合作为头像使用'
}

// 缓存
let categoryCache = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取分类描述
 */
function getDescription(name) {
  return CATEGORY_DESCRIPTIONS[name] || `${name}相关内容`
}

/**
 * 从 GitHub 获取目录结构
 */
async function fetchDirectoryStructure(owner, repo, branch = 'main') {
  const structure = {
    desktop: { subcategories: {} },
    mobile: { subcategories: {} },
    avatar: { subcategories: {} }
  }

  // 获取 wallpaper 目录下的主分类
  const primaryCategories = ['desktop', 'mobile', 'avatar']

  for (const primary of primaryCategories) {
    try {
      // 获取二级分类目录
      const secondaryDirs = await githubService.getContents(
        owner,
        repo,
        `wallpaper/${primary}`,
        branch
      )

      if (Array.isArray(secondaryDirs)) {
        for (const dir of secondaryDirs) {
          if (dir.type === 'dir') {
            const secondaryName = dir.name
            structure[primary].subcategories[secondaryName] = []

            // 获取三级分类目录
            try {
              const thirdDirs = await githubService.getContents(
                owner,
                repo,
                `wallpaper/${primary}/${secondaryName}`,
                branch
              )

              if (Array.isArray(thirdDirs)) {
                for (const subDir of thirdDirs) {
                  if (subDir.type === 'dir') {
                    structure[primary].subcategories[secondaryName].push(subDir.name)
                  }
                }
              }
            } catch (e) {
              console.warn(`获取三级分类失败: ${primary}/${secondaryName}`, e)
            }
          }
        }
      }
    } catch (e) {
      console.warn(`获取二级分类失败: ${primary}`, e)
    }
  }

  return structure
}

/**
 * 获取分类数据（带缓存）
 */
export async function getCategories(owner, repo, branch = 'main', forceRefresh = false) {
  const now = Date.now()

  // 检查缓存
  if (!forceRefresh && categoryCache && now - cacheTime < CACHE_DURATION) {
    return categoryCache
  }

  try {
    const structure = await fetchDirectoryStructure(owner, repo, branch)

    // 转换为标准格式
    const categories = {}

    for (const [primary, data] of Object.entries(structure)) {
      categories[primary] = {
        name:
          primary === 'desktop'
            ? 'Desktop（桌面壁纸）'
            : primary === 'mobile'
              ? 'Mobile（手机壁纸）'
              : 'Avatar（头像）',
        description: PRIMARY_DESCRIPTIONS[primary],
        subcategories: Object.keys(data.subcategories).map(name => ({
          value: name,
          label: name,
          description: getDescription(name)
        }))
      }
    }

    // 更新缓存
    categoryCache = categories
    cacheTime = now

    return categories
  } catch (error) {
    console.error('获取分类失败:', error)
    // 如果有缓存，返回缓存
    if (categoryCache) {
      return categoryCache
    }
    throw error
  }
}

/**
 * 获取三级分类数据（带缓存）
 */
export async function getSubcategories(owner, repo, branch = 'main', forceRefresh = false) {
  const now = Date.now()

  // 检查缓存
  if (!forceRefresh && categoryCache && now - cacheTime < CACHE_DURATION) {
    // 从缓存构建三级分类
    return buildSubcategoriesFromCache()
  }

  try {
    const structure = await fetchDirectoryStructure(owner, repo, branch)

    // 转换为三级分类格式
    const subcategories = {}

    for (const [primary, data] of Object.entries(structure)) {
      subcategories[primary] = {}
      for (const [secondary, thirds] of Object.entries(data.subcategories)) {
        // 确保至少有"通用"选项
        subcategories[primary][secondary] = thirds.length > 0 ? thirds : ['通用']
      }
    }

    return subcategories
  } catch (error) {
    console.error('获取三级分类失败:', error)
    throw error
  }
}

/**
 * 从缓存构建三级分类
 */
function buildSubcategoriesFromCache() {
  // 这里需要重新获取，因为缓存中没有三级分类详情
  return null
}

/**
 * 清除缓存
 */
export function clearCategoryCache() {
  categoryCache = null
  cacheTime = 0
}

/**
 * 获取所有主分类
 */
export function getPrimaryCategories() {
  return ['desktop', 'mobile', 'avatar']
}

/**
 * 生成 AI Prompt 的分类说明
 */
export async function generateCategoryPrompt(owner, repo, branch = 'main') {
  const categories = await getCategories(owner, repo, branch)
  const subcategories = await getSubcategories(owner, repo, branch)

  let prompt = '【第一步：判断壁纸类型】\n'

  for (const [key, config] of Object.entries(categories)) {
    prompt += `- ${key}（${config.name}）：${config.description}\n`
  }

  prompt += '\n【第二步：选择二级分类】\n'
  prompt += '必须从以下现有分类中选择一个最匹配的：\n\n'

  for (const [key, config] of Object.entries(categories)) {
    prompt += `如果是 ${key}（${config.name}），从这些分类中选择：\n`
    config.subcategories.forEach(sub => {
      prompt += `- ${sub.value}：${sub.description}\n`
    })
    prompt += '\n'
  }

  prompt += '【第三步：选择三级分类】\n'
  prompt += '根据二级分类，从以下子分类中选择：\n\n'

  for (const [primary, secondaryMap] of Object.entries(subcategories)) {
    for (const [secondary, thirds] of Object.entries(secondaryMap)) {
      prompt += `【${primary} > ${secondary}】的三级分类：\n`
      thirds.forEach(third => {
        const desc = getDescription(third)
        prompt += `  - ${third}：${desc}\n`
      })
      prompt += '\n'
    }
  }

  return prompt
}

export default {
  getCategories,
  getSubcategories,
  clearCategoryCache,
  getPrimaryCategories,
  generateCategoryPrompt,
  getDescription
}
