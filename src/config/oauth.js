// GitHub OAuth 配置
export const oauthConfig = {
  clientId: 'Ov23li2QrljIDmhjRkGU',
  // Worker 地址
  tokenEndpoint: 'https://auth.061129.xyz/token',
  // 授权地址
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  // 回调地址
  redirectUri: import.meta.env.DEV
    ? 'http://localhost:5173/callback'
    : 'https://wallpaper-gallery-studio.061129.xyz/callback',
  // 请求的权限范围
  scope: 'repo'
}

// 生成授权 URL
export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: oauthConfig.clientId,
    redirect_uri: oauthConfig.redirectUri,
    scope: oauthConfig.scope,
    state: generateState()
  })
  return `${oauthConfig.authorizeUrl}?${params}`
}

// 生成随机 state 防止 CSRF
function generateState() {
  const state = globalThis.crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)
  return state
}

// 验证 state
export function verifyState(state) {
  const saved = sessionStorage.getItem('oauth_state')
  sessionStorage.removeItem('oauth_state')
  return saved === state
}

// 用 code 换 token
export async function exchangeToken(code) {
  const response = await fetch(oauthConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取 Token 失败')
  }

  const data = await response.json()
  return data.access_token
}
