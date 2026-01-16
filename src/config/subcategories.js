/**
 * 三级分类配置（子目录）
 * 从图床仓库实际目录结构提取
 * 最后更新：2026-01-16
 */

export const SUBCATEGORIES = {
  // Desktop 分类
  desktop: {
    动漫: [
      '二次元',
      '百炼成神',
      '初音未来',
      '春物雪乃',
      '刀剑神域',
      '斗破苍穹',
      '哆啦A梦',
      '鬼灭之刃',
      '间谍过家家',
      '剑来',
      '进击的巨人',
      '蜡笔小新',
      '蕾姆',
      '猫和老鼠',
      '名侦探柯南',
      '神奇宝贝',
      '完美世界',
      '喜洋洋与灰太狼',
      '仙逆',
      '小埋',
      '新世纪福音战士',
      '紫罗兰永恒花园',
      '罪恶王冠'
    ],
    风景: ['城市', '海滨', '湖泊', '花卉', '建筑', '日落', '天空', '星空', '雪山'],
    游戏: ['艾尔登法环', '崩坏', '通用', '英雄联盟', '原神'],
    萌宠: ['狗狗', '猫咪', '兔兔'],
    人像: ['氛围感', '国风', '魅力', '明星', '清新', '张凌赫'],
    影视: ['疯狂动物城', '海绵宝宝'],
    插画: ['场景', '创意', '国风', '卡通', '通用', '文字'],
    政治: ['通用'],
    IP形象: ['粉红兔', '凯蒂猫', '水豚噜噜', '通用', '乌萨奇', '线条小狗']
  },

  // Mobile 分类
  mobile: {
    动漫: [
      '初音未来',
      '二次元',
      '海贼王',
      '蜡笔小新',
      '名侦探柯南',
      '你的名字',
      '通用',
      '夏目友人帐'
    ],
    风景: ['冬日雪景', '海滨', '花卉', '建筑', '森林', '星空', '雪山'],
    插画: ['创意', '风景', '国风', '少女与猫'],
    创意: ['爱国主题', '抽象', '文字'],
    萌宠: ['狗狗', '猫咪'],
    人像: [
      '迪丽热巴',
      '氛围感',
      '古装',
      '魅力',
      '明星',
      '清新',
      '日系',
      '王楚然',
      '易烊千玺',
      '张凌赫'
    ],
    影视: ['疯狂动物城', '海绵宝宝', '柯南', '漫威', '猫和老鼠'],
    IP形象: ['粉红兔', '卡通角色', '水豚噜噜', '乌萨奇', '小八']
  },

  // Avatar 分类
  avatar: {
    动漫: [
      '哆啦A梦',
      '海绵宝宝',
      '海贼王',
      '蜡笔小新',
      '猫和老鼠',
      '日漫',
      '神奇宝贝',
      '天线宝宝',
      '通用',
      '喜羊羊与灰太狼',
      '樱桃小丸子'
    ],
    表情包: ['搞怪'],
    插画: ['创意', '二次元'],
    萌宠: ['狗狗', '猫咪'],
    人像: ['背影', '氛围感', '卡通简笔画', '甜妹'],
    IP形象: ['库洛米', '牛牛黎深&噜噜', '水豚噜噜', '乌萨奇', '小八', '小熊', 'Hello Kitty']
  }
}

/**
 * 获取三级分类列表
 */
export function getThirdLevelCategories(primaryCategory, secondaryCategory) {
  return SUBCATEGORIES[primaryCategory]?.[secondaryCategory] || ['通用']
}

/**
 * 生成 AI Prompt 的三级分类说明
 */
export function generateSubcategoryPrompt(primaryCategory, secondaryCategory) {
  const subcategories = getThirdLevelCategories(primaryCategory, secondaryCategory)

  let prompt = `【三级分类】\n`
  prompt += `请从以下子分类中选择最匹配的一个：\n\n`

  subcategories.forEach(sub => {
    if (sub === '通用') {
      prompt += `- ${sub}：无法识别具体系列时选择此项\n`
    } else if (sub === '二次元') {
      prompt += `- ${sub}：通用动漫风格，无法识别具体作品时选择此项\n`
    } else {
      prompt += `- ${sub}\n`
    }
  })

  return prompt
}

/**
 * 验证三级分类是否有效
 */
export function isValidSubcategory(primaryCategory, secondaryCategory, thirdCategory) {
  const subcategories = getThirdLevelCategories(primaryCategory, secondaryCategory)
  return subcategories.includes(thirdCategory)
}
