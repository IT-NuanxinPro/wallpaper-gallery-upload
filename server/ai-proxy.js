/**
 * AI 分析代理服务器
 * 解决浏览器 CORS 跨域问题
 */

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = 3001

// 启用 CORS
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// AI 分析接口
app.post('/api/analyze', async (req, res) => {
  try {
    const { accountId, aiToken, image, prompt } = req.body

    if (!accountId || !aiToken || !image || !prompt) {
      return res.status(400).json({
        error: '缺少必要参数'
      })
    }

    // 调用 Cloudflare AI API
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: [image],
        prompt: prompt,
        max_tokens: 512
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({
        error: `Cloudflare API 错误: ${response.status}`,
        details: errorText
      })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('代理服务器错误:', error)
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    })
  }
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI 代理服务器运行中' })
})

app.listen(PORT, () => {
  console.log(`🚀 AI 代理服务器启动成功！`)
  console.log(`📡 监听端口: http://localhost:${PORT}`)
  console.log(`✅ 健康检查: http://localhost:${PORT}/health`)
})
