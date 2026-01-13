# Wallpaper Gallery · Studio

<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="Logo">
</p>

<p align="center">
  一个现代化的壁纸上传管理后台，支持 GitHub OAuth 登录、图片分类管理和工作流自动化。
</p>

## ✨ 功能特性

### 🔐 认证与权限

- **GitHub OAuth 登录** - 安全的 OAuth 认证
- **Token 登录** - 支持 Personal Access Token
- **权限分级** - 管理员 / 可写 / 只读 / 无权限
- **权限标签显示** - 导航栏实时显示当前权限

### 📁 分类管理

- **三级分类** - Desktop / Mobile / Avatar
- **树形结构** - 支持一级和二级分类
- **新建分类** - 可写权限用户可创建分类

### 🖼️ 图片上传

- **拖拽上传** - 支持拖拽文件和文件夹
- **批量上传** - 支持多文件同时上传
- **多目录上传** - 单次上传支持不同文件指定不同目标目录
- **系列标识** - 不同系列文件显示颜色边框和图标标识
- **重复检测** - 基于内容 Hash 检测重复上传
- **实时预览** - 上传前图片预览和信息展示
- **进度显示** - 圆形进度条显示上传状态
- **失败重试** - 上传失败文件支持一键重试

### ⚡ 工作流集成

- **一键触发** - 触发图片处理工作流
- **状态监控** - 实时显示工作流运行状态（运行中按钮变橙色）
- **失败提示** - 工作流失败时显示详情链接
- **版本回滚** - 管理员可回滚到上一版本

### 📊 统计与历史

- **壁纸统计** - 显示各分类壁纸总数和增量
- **系列图例** - 统计栏显示系列颜色标识
- **发布历史** - 查看历史发布记录、趋势图和发布者
- **上传历史** - 本地上传记录查看

### 🎨 UI/UX

- **毛玻璃设计** - 现代化暗色主题
- **渐变配色** - 紫色渐变主题色
- **响应式布局** - 适配不同屏幕尺寸
- **流畅动画** - GSAP 驱动的过渡动画

## 🛠️ 技术栈

| 类别 | 技术                      |
| ---- | ------------------------- |
| 框架 | Vue 3 + Composition API   |
| 构建 | Vite 7                    |
| UI   | Element Plus              |
| 状态 | Pinia                     |
| 动画 | GSAP                      |
| 样式 | SCSS + CSS Variables      |
| 规范 | ESLint + Prettier + Husky |

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
├── components/          # 公共组件
│   ├── upload/          # 上传相关组件
│   │   ├── CategorySidebar.vue
│   │   ├── UploadPanel.vue
│   │   ├── ImagePreview.vue
│   │   ├── WorkflowPanel.vue
│   │   ├── WallpaperStatsBar.vue
│   │   └── ReleaseHistoryModal.vue
│   ├── GlassCard.vue    # 毛玻璃卡片
│   └── MainLayout.vue   # 主布局
├── composables/         # 组合式函数
│   ├── useAnimation.js
│   └── useErrorHandler.js
├── router/              # 路由配置
├── services/            # API 服务
│   └── github.js        # GitHub API 封装
├── stores/              # Pinia 状态管理
│   ├── auth.js          # 认证状态
│   ├── config.js        # 配置状态
│   ├── upload.js        # 上传状态
│   ├── workflow.js      # 工作流状态
│   └── history.js       # 历史记录
├── styles/              # 全局样式
│   └── variables.scss   # SCSS 变量
├── utils/               # 工具函数
│   └── errorHandler.js  # 错误处理
└── views/               # 页面视图
    ├── LoginView.vue
    ├── UploadView.vue
    ├── HistoryView.vue
    └── SettingsView.vue
```

## 🔧 配置说明

### 环境变量

```env
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_OAUTH_WORKER_URL=https://your-worker.workers.dev
```

### 默认配置

| 配置项     | 默认值                                     |
| ---------- | ------------------------------------------ |
| 图床仓库   | `IT-NuanxinPro/nuanXinProPic`              |
| 工作流仓库 | `IT-NuanxinPro/wallpaper-gallery-workflow` |
| 分支       | `main`                                     |

## 🔒 权限说明

| 权限级别 | 说明                | 功能            |
| -------- | ------------------- | --------------- |
| 管理员   | 仓库 Owner          | 全部功能 + 回滚 |
| 可写     | Collaborator (push) | 上传 + 新建分类 |
| 只读     | Collaborator (pull) | 仅浏览          |
| 无权限   | 无仓库访问权限      | 无法使用        |

## 📝 本地存储

| Key               | 用途          | 过期策略            |
| ----------------- | ------------- | ------------------- |
| `auth_token`      | GitHub Token  | 手动登出清除        |
| `uploaded_hashes` | 上传文件 Hash | 30 天 / 最多 500 条 |
| `upload_history`  | 上传历史记录  | 手动清除            |

## 📄 License

MIT
