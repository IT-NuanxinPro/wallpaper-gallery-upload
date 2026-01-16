# Cloudflare Worker - AI 代理

这个 Worker 用于代理 Cloudflare AI API 请求，解决浏览器 CORS 跨域问题。

## 🚀 快速部署

```bash
# 1. 安装 Wrangler CLI（如果还没安装）
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 部署 Worker
wrangler deploy
```

## 📝 配置文件

- `ai-proxy.js` - Worker 代码
- `../wrangler.toml` - Worker 配置

## 🔗 使用方式

部署后，你会得到一个 Worker URL：

```
https://ai-proxy.your-subdomain.workers.dev
```

在前端代码中使用这个 URL 替换直接调用 Cloudflare API。

## 📖 详细文档

查看 `../WORKER-DEPLOY.md` 获取完整部署指南。

## 🔒 安全说明

- Worker 不存储任何敏感信息
- Account ID 和 Token 由前端传递
- 支持 CORS，允许跨域请求
- 免费额度：100,000 请求/天

## 🛠️ 本地开发

```bash
# 启动本地开发服务器
wrangler dev

# 访问 http://localhost:8787 进行测试
```

## 📊 监控

访问 Cloudflare Dashboard 查看 Worker 使用情况：
https://dash.cloudflare.com/workers
