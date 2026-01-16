/**
 * AI 响应解析器
 * 适配不同模型的响应格式，统一返回格式
 */

/**
 * 响应解析器基类
 */
class ResponseParser {
  /**
   * 解析 API 响应
   * @param {Object} _apiResponse - API 响应
   * @returns {Object} 解析后的结果
   */
  parse(_apiResponse) {
    throw new Error('parse() must be implemented by subclass')
  }

  /**
   * 格式化结果
   * @param {Object} data - 原始数据
   * @returns {Object} 格式化后的结果
   */
  formatResult(data) {
    // 兼容不同的字段名 - AI 可能返回各种字段名
    const secondary =
      data.secondary || data.sub_category || data.subCategory || data.secondaryCategory || '通用'
    const third =
      data.third || data.sub_sub_category || data.subSubCategory || data.thirdCategory || '通用'

    // 确保 filenameSuggestions 是数组
    let filenameSuggestions = []
    if (Array.isArray(data.filenameSuggestions)) {
      filenameSuggestions = data.filenameSuggestions
    } else if (data.filename) {
      // 如果只有单个 filename，生成 3 个建议
      const baseFilename = data.filename
      const timestamp = Date.now().toString().slice(-6)
      filenameSuggestions = [
        baseFilename,
        `${baseFilename}-${timestamp}`,
        `${secondary}-${data.keywords?.[0] || '图片'}`
      ]
    } else {
      filenameSuggestions = ['壁纸', '壁纸-1', '壁纸-2']
    }

    // 处理建议的新分类
    const suggestedCategory = data.suggestedCategory || null
    const suggestedThird = data.suggestedThird || null

    // 判断是否使用了建议分类
    const isNewCategory =
      suggestedCategory && suggestedCategory !== 'null' && suggestedCategory !== null
    const isNewThird = suggestedThird && suggestedThird !== 'null' && suggestedThird !== null

    return {
      secondary,
      third,
      suggestedCategory: isNewCategory ? suggestedCategory : null,
      suggestedThird: isNewThird ? suggestedThird : null,
      isNewCategory,
      isNewThird,
      filenameSuggestions: filenameSuggestions.slice(0, 3), // 确保只有 3 个
      description: data.description || '无描述',
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      confidence: 0.9, // 默认置信度
      raw: data
    }
  }

  /**
   * 提取 JSON
   * @param {string} text - 文本
   * @returns {Object|null} JSON 对象
   */
  extractJSON(text) {
    try {
      // 尝试直接解析
      return JSON.parse(text)
    } catch {
      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let jsonStr = jsonMatch[0]

        // 尝试修复截断的 JSON
        try {
          return JSON.parse(jsonStr)
        } catch {
          // 尝试修复常见的截断问题
          jsonStr = this.fixTruncatedJSON(jsonStr)
          try {
            return JSON.parse(jsonStr)
          } catch {
            return null
          }
        }
      }
      return null
    }
  }

  /**
   * 修复截断的 JSON
   * @param {string} jsonStr - 截断的 JSON 字符串
   * @returns {string} 修复后的 JSON 字符串
   */
  fixTruncatedJSON(jsonStr) {
    // 移除重复的数组元素（如 "腕饰","腕饰","腕饰"...）
    jsonStr = jsonStr.replace(/("([^"]+)",\s*)\1{3,}/g, '"$2"')

    // 计算未闭合的括号
    let braceCount = 0
    let bracketCount = 0
    let inString = false
    let escaped = false

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') braceCount++
        else if (char === '}') braceCount--
        else if (char === '[') bracketCount++
        else if (char === ']') bracketCount--
      }
    }

    // 如果在字符串中间截断，先闭合字符串
    if (inString) {
      jsonStr += '"'
    }

    // 闭合数组
    while (bracketCount > 0) {
      jsonStr += ']'
      bracketCount--
    }

    // 闭合对象
    while (braceCount > 0) {
      jsonStr += '}'
      braceCount--
    }

    return jsonStr
  }
}

/**
 * Llama 3.2 解析器
 */
class LlamaParser extends ResponseParser {
  parse(apiResponse) {
    try {
      let responseData = apiResponse.result?.response

      // 如果 response 已经是对象，直接使用
      if (typeof responseData === 'object' && responseData !== null) {
        return this.formatResult(responseData)
      }

      // 如果是字符串，尝试提取 JSON
      const responseText = String(responseData || apiResponse.result?.description || '')
      const parsed = this.extractJSON(responseText)

      if (parsed) {
        return this.formatResult(parsed)
      }

      // 如果无法提取 JSON，尝试从 Markdown 格式中提取信息
      const markdownParsed = this.parseMarkdownResponse(responseText)
      if (markdownParsed) {
        return this.formatResult(markdownParsed)
      }

      throw new Error('AI 返回格式不正确，未找到 JSON 数据')
    } catch (error) {
      console.error('[LlamaParser] Parse error:', error)
      throw new Error(`解析失败: ${error.message}`)
    }
  }

  /**
   * 从 Markdown 格式响应中提取信息
   * @param {string} text - Markdown 文本
   * @returns {Object|null} 解析结果
   */
  parseMarkdownResponse(text) {
    try {
      const result = {
        secondary: '通用',
        third: '通用',
        suggestedCategory: null,
        suggestedThird: null,
        keywords: [],
        filenameSuggestions: [],
        description: ''
      }

      // 提取一级分类（二级分类）
      const secondaryMatch = text.match(/[一二]级分类[：:]\s*(.+)/i)
      if (secondaryMatch) {
        result.secondary = secondaryMatch[1].trim().replace(/\*+/g, '')
      }

      // 提取二级分类（三级分类）
      const thirdMatch = text.match(/[二三]级分类[：:]\s*(.+)/i)
      if (thirdMatch) {
        result.third = thirdMatch[1].trim().replace(/\*+/g, '')
      }

      // 提取关键词
      const keywordsMatch = text.match(/关键词[：:]\s*(.+)/i)
      if (keywordsMatch) {
        const keywordsStr = keywordsMatch[1].trim()
        result.keywords = keywordsStr.split(/[,，、\s]+/).filter(k => k.length > 0)
      }

      // 提取文件名建议
      const filenameMatches = text.match(/文件名[建议]*[：:]\s*(.+)/gi)
      if (filenameMatches) {
        filenameMatches.forEach(match => {
          const name = match
            .replace(/文件名[建议]*[：:]\s*/i, '')
            .trim()
            .replace(/\*+/g, '')
          if (name && name.length > 2) {
            result.filenameSuggestions.push(name)
          }
        })
      }

      // 提取描述
      const descMatch = text.match(/描述[：:]\s*(.+)/i)
      if (descMatch) {
        result.description = descMatch[1].trim().replace(/\*+/g, '')
      }

      // 如果没有提取到文件名，根据分类生成
      if (result.filenameSuggestions.length === 0) {
        const baseName = `${result.secondary}${result.third}壁纸`
        result.filenameSuggestions = [baseName, `${baseName}高清`, `${baseName}精选`]
      }

      // 如果没有描述，使用分类信息
      if (!result.description) {
        result.description = `${result.secondary} - ${result.third}`
      }

      return result
    } catch (error) {
      console.error('[LlamaParser] Markdown parse error:', error)
      return null
    }
  }
}

/**
 * 解析器工厂
 * @param {string} modelType - 模型类型 ('llama')
 * @returns {ResponseParser} 解析器实例
 */
export function createParser(modelType) {
  if (modelType === 'llama') {
    return new LlamaParser()
  }
  throw new Error(`Unknown model type: ${modelType}`)
}

/**
 * 解析响应（便捷函数）
 * @param {Object} apiResponse - API 响应
 * @param {string} modelType - 模型类型
 * @returns {Object} 解析后的结果
 */
export function parseResponse(apiResponse, modelType) {
  const parser = createParser(modelType)
  return parser.parse(apiResponse)
}
