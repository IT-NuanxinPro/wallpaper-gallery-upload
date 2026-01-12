# Wallpaper Gallery · Studio

<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="Logo">
</p>

<p align="center">
  一个现代化的壁纸上传管理后台，支持 GitHub Token 登录和图片分类管理。
</p>

## ✨ 功能特性

- 🔐 **GitHub Token 登录** - 安全的 Token 认证方式
- 📁 **分类管理** - 按分类浏览和上传壁纸
- 🖼️ **拖拽上传** - 支持拖拽和点击上传图片
- 📊 **上传历史** - 查看和管理上传记录
- 🎨 **毛玻璃 UI** - 现代化暗色主题 + 渐变设计
- ⚡ **工作流触发** - 一键触发图片处理工作流
- 🔄 **实时预览** - 上传前图片预览和信息展示

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite 7** - 下一代前端构建工具
- **Element Plus** - Vue 3 组件库
- **Pinia** - Vue 状态管理
- **GSAP** - 动画库
- **SCSS** - CSS 预处理器
- **Husky** - Git Hooks 工具
- **lint-staged** - 暂存文件检查

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 📁 项目结构

```
src/
├── components/       # 公共组件
│   └── upload/       # 上传相关组件
├── composables/      # 组合式函数
├── router/           # 路由配置
├── services/         # API 服务
├── stores/           # Pinia 状态管理
├── styles/           # 全局样式
├── utils/            # 工具函数
└── views/            # 页面视图
```

## 🔧 开发规范

项目使用 Husky + lint-staged 进行提交前检查：

- **ESLint** - JavaScript/Vue 代码检查
- **Prettier** - 代码格式化

每次 `git commit` 时会自动运行检查和格式化。

## 📝 配置说明

默认配置：

- **仓库**: `IT-NuanxinPro/nuanXinProPic`
- **分支**: `main`

可在设置页面修改目标仓库配置。

## 📄 License

MIT
