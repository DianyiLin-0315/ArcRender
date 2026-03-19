# ArcRender

以参考图为驱动的 AI 建筑渲染工作台。在无限画布上浏览参考图库，将参考图拖拽叠加到方案图，自动生成建筑效果图。

![ArcRender](public/next.svg)

## 核心功能

- **无限画布**：鼠标滚轮缩放，拖拽平移，所有卡片均可自由移动
- **参考图库**：按建筑类型筛选，一键拖拽设为风格来源
- **拖拽合成**：将参考图拖到方案图上，触发合成动画，松手立即生成
- **持久结果**：每次生成追加新卡片，历史结果不被覆盖，便于对比
- **参数控制**：建筑类型 × 环境 × 参考强度，无需手写 prompt
- **图片压缩**：大图自动压缩，适配 API 请求体限制

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS 4 + 自定义设计系统
- **AI**：Google Gemini API（多模态图像生成）
- **分析**：PostHog（可选）

## 本地开发

### 环境要求

- Node.js 18+
- Google Gemini API Key（[获取地址](https://aistudio.google.com/apikey)）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/ArcRender.git
cd ArcRender

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 GEMINI_API_KEY

# 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 是 |

## 部署到 Vercel

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在项目设置中添加环境变量 `GEMINI_API_KEY`
4. 部署完成

## 项目结构

```
src/
├── app/
│   ├── page.tsx                  # 无限画布主界面
│   ├── api/generate/route.ts     # Gemini 双图生成 API
│   └── globals.css               # 设计系统 & 全局样式
├── components/
│   ├── ReferenceGallery.tsx      # 左侧参考图库
│   ├── InputPanel.tsx            # 参数设置面板
│   ├── OutputPanel.tsx           # 输出结果面板
│   └── ImageModal.tsx            # 大图预览弹窗
├── data/
│   └── gallery.ts                # 图库数据
└── lib/
    ├── image.ts                  # 图片压缩 & 转换工具
    └── posthog.ts                # 分析埋点
```

## License

[Apache 2.0](./LICENSE)
