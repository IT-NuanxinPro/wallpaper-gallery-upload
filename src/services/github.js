/**
 * GitHub API 服务
 * 处理认证、仓库内容、文件操作等
 */

const API_BASE = 'https://api.github.com'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

/**
 * GitHub 服务类
 */
class GitHubService {
  constructor() {
    this.token = null
    // API 配额信息
    this.rateLimit = {
      limit: 5000,
      remaining: 5000,
      reset: null,
      used: 0
    }
  }

  /**
   * 获取当前配额信息
   */
  getRateLimit() {
    return { ...this.rateLimit }
  }

  /**
   * 设置访问令牌
   */
  setToken(token) {
    this.token = token
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  /**
   * 基础请求封装，支持重试
   */
  async request(endpoint, options = {}, retries = MAX_RETRIES) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      })

      // 更新配额信息
      const limit = response.headers.get('X-RateLimit-Limit')
      const remaining = response.headers.get('X-RateLimit-Remaining')
      const resetTime = response.headers.get('X-RateLimit-Reset')
      const used = response.headers.get('X-RateLimit-Used')

      if (limit) this.rateLimit.limit = parseInt(limit)
      if (remaining) this.rateLimit.remaining = parseInt(remaining)
      if (resetTime) this.rateLimit.reset = new Date(parseInt(resetTime) * 1000)
      if (used) this.rateLimit.used = parseInt(used)

      if (response.status === 403 && remaining === '0') {
        const resetDate = new Date(parseInt(resetTime) * 1000)
        throw {
          type: 'RATE_LIMITED',
          message: 'API 请求过于频繁',
          resetTime: resetDate
        }
      }

      // 检查 token 过期
      if (response.status === 401) {
        throw {
          type: 'TOKEN_EXPIRED',
          message: '登录已过期，请重新登录'
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw {
          type: 'API_ERROR',
          message: error.message || `请求失败: ${response.status}`,
          status: response.status
        }
      }

      // 204 No Content
      if (response.status === 204) {
        return null
      }

      return await response.json()
    } catch (error) {
      // 网络错误重试
      if (error.name === 'TypeError' && retries > 0) {
        await this.delay(RETRY_DELAY)
        return this.request(endpoint, options, retries - 1)
      }

      // 已处理的错误直接抛出
      if (error.type) {
        throw error
      }

      throw {
        type: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络',
        original: error
      }
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============ OAuth 认证 ============

  /**
   * 构建 OAuth 授权 URL
   */
  getAuthUrl(clientId, redirectUri, scope = 'repo') {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * 使用 code 交换 token（需要后端代理）
   * 注意：由于 CORS 限制，这个请求需要通过后端代理
   */
  async exchangeCodeForToken(_code, _clientId, _clientSecret, _redirectUri) {
    // 这里需要后端代理，前端无法直接调用
    // 返回格式: { access_token, token_type, scope }
    throw new Error('需要后端代理实现 token 交换')
  }

  // ============ 用户信息 ============

  /**
   * 获取当前用户信息
   */
  async getCurrentUser() {
    return this.request('/user')
  }

  /**
   * 检查用户对仓库的权限
   */
  async checkRepoAccess(owner, repo) {
    try {
      const data = await this.request(`/repos/${owner}/${repo}`)

      if (data.permissions) {
        if (data.permissions.admin) return 'admin'
        if (data.permissions.push) return 'write'
        if (data.permissions.pull) return 'read'
        return 'none'
      }

      return 'read'
    } catch (error) {
      if (error.status === 404) {
        return 'none'
      }
      throw error
    }
  }

  // ============ 仓库内容 ============

  /**
   * 获取目录内容
   */
  async getContents(owner, repo, path = '', branch = 'main') {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`
    const params = branch ? `?ref=${branch}` : ''
    return this.request(endpoint + params)
  }

  /**
   * 获取完整目录树
   */
  async getTree(owner, repo, sha, recursive = true) {
    const endpoint = `/repos/${owner}/${repo}/git/trees/${sha}`
    const params = recursive ? '?recursive=1' : ''
    return this.request(endpoint + params)
  }

  /**
   * 检查文件是否存在
   */
  async checkFileExists(owner, repo, path, branch = 'main') {
    try {
      await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`)
      return true
    } catch (error) {
      if (error.status === 404) {
        return false
      }
      throw error
    }
  }

  // ============ 文件操作 ============

  /**
   * 创建或更新文件
   */
  async createFile(owner, repo, path, content, message, branch = 'main', sha = null) {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`

    const body = {
      message,
      content: this.toBase64(content),
      branch
    }

    // 如果是更新文件，需要提供 sha
    if (sha) {
      body.sha = sha
    }

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  /**
   * 上传图片文件
   */
  async uploadImage(owner, repo, path, file, message, branch = 'main') {
    const content = await this.fileToBase64(file)

    // 检查文件是否存在
    let sha = null
    try {
      const existing = await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`)
      sha = existing.sha
    } catch {
      // 文件不存在，正常创建
    }

    const endpoint = `/repos/${owner}/${repo}/contents/${path}`
    const body = {
      message,
      content,
      branch
    }

    if (sha) {
      body.sha = sha
    }

    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  // ============ Workflow ============

  /**
   * 触发 GitHub Actions workflow (repository_dispatch)
   */
  async triggerWorkflow(owner, repo, eventType = 'process-wallpapers', payload = {}) {
    const endpoint = `/repos/${owner}/${repo}/dispatches`

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventType,
        client_payload: payload
      })
    })
  }

  /**
   * 获取最近的工作流运行状态
   */
  async getWorkflowRuns(owner, repo, perPage = 5) {
    const endpoint = `/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`
    return this.request(endpoint)
  }

  /**
   * 检查是否有正在运行的工作流
   */
  async hasRunningWorkflow(owner, repo) {
    try {
      const data = await this.getWorkflowRuns(owner, repo, 5)
      const runs = data.workflow_runs || []

      // 检查是否有 queued 或 in_progress 状态的运行
      const running = runs.find(run => run.status === 'queued' || run.status === 'in_progress')

      return {
        hasRunning: !!running,
        runningWorkflow: running || null,
        latestRun: runs[0] || null
      }
    } catch (error) {
      // 如果查询失败，允许触发（避免阻塞用户）
      console.warn('Failed to check workflow status:', error)
      return { hasRunning: false, runningWorkflow: null, latestRun: null }
    }
  }

  /**
   * 触发 GitHub Actions workflow (workflow_dispatch)
   * @deprecated 使用 triggerWorkflow 代替
   */
  async dispatchWorkflow(owner, repo, workflowId, ref = 'main', inputs = {}) {
    const endpoint = `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        ref,
        inputs
      })
    })
  }

  // ============ 工具方法 ============

  /**
   * 字符串转 Base64
   */
  toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)))
  }

  /**
   * 文件转 Base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        // 移除 data:xxx;base64, 前缀
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

// 导出单例
export const githubService = new GitHubService()
export default githubService
