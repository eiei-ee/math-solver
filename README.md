# AI 数学题解题助手

基于大语言模型的数学题解答桌面应用。用户可以通过文字、图片或 LaTeX 公式输入数学题，应用调用大模型 API 生成中文逐步推导过程，并使用 Markdown + KaTeX 渲染数学公式，帮助用户更清晰地理解解题思路。

> 项目定位：AI 产品 Demo / AIGC 教育应用 / 大模型应用开发课程设计

## 维护状态

本仓保留 Electron 历史基线和旧版下载。当前主维护版本为 [math-solver-unified](https://github.com/eiei-ee/math-solver-unified)，新用户请优先查看该仓的说明和 Releases。本仓的旧版本不等同于 unified 当前版本。

## 项目背景

数学题解答场景中，用户常见痛点包括：

- 题目录入方式不统一：有些题是文字，有些题来自截图或试卷照片，有些题包含复杂公式。
- 普通搜索难以获得结构化推导过程，答案解释不够连续。
- 不同大模型能力和成本不同，用户希望可以根据需要切换模型。
- 数学公式如果只以纯文本展示，可读性较差。

本项目围绕“快速输入题目、获得清晰推导、方便切换模型”的核心流程，设计并实现了一个桌面端 AI 解题助手 MVP。

## 核心功能

- 文字题输入：支持直接输入数学题，使用 Ctrl + Enter 快捷发送。
- 图片题输入：支持上传或拖拽图片，自动预览并压缩图片后提交给视觉模型。
- LaTeX 输入：支持输入 LaTeX 公式，并提供实时公式预览。
- 多模型服务商：支持 DeepSeek、OpenAI、通义千问、智谱 GLM、Kimi、Gemini、Grok、Mistral、Claude 等服务商。
- 模型配置：支持 API Key、本地模型和服务商配置，并持久化保存到本地。
- 流式回答：基于 SSE / ReadableStream 实现逐字输出，降低等待感。
- 公式渲染：使用 Markdown + KaTeX 渲染行内公式和独立公式。
- 桌面端打包：基于 Electron 打包为 Windows 桌面应用。

## 产品流程

```text
选择输入方式
  ├── 文字输入
  ├── 图片上传 / 拖拽
  └── LaTeX 公式输入
        ↓
配置服务商、模型和 API Key
        ↓
提交题目
        ↓
大模型流式生成解题过程
        ↓
Markdown + KaTeX 渲染展示
        ↓
用户查看推导步骤与最终答案
```

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 桌面端框架 | Electron 33 |
| 前端框架 | React 18 |
| 开发语言 | TypeScript |
| 构建工具 | electron-vite |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 数学公式渲染 | KaTeX |
| Markdown 渲染 | react-markdown |
| 打包 | electron-builder |

## 项目结构

```text
src/
  main/
    index.ts          Electron 窗口创建
    ipc.ts            IPC 通信、设置持久化、多模型 API 调用、SSE 流处理
  preload/
    index.ts          contextBridge 暴露安全 API
  renderer/
    App.tsx           应用主布局
    api/
      client.ts       ChatPayload 构造
      registry.ts     多模型服务商配置
      types.ts        类型定义
    components/
      InputPanel.tsx      左侧输入区域
      TextTab.tsx         文字输入
      ImageTab.tsx        图片上传与压缩
      LatexTab.tsx        LaTeX 输入与预览
      AnswerPanel.tsx     回答展示与公式渲染
      SettingsDialog.tsx  模型和 API Key 配置
    store/
      chat.ts         对话状态管理
      settings.ts     设置状态管理
```

## 核心实现

### 1. 多输入方式设计

项目将输入方式拆分为文字、图片、LaTeX 三个 Tab，对应不同数学题来源：

- 文字输入适合普通题干。
- 图片输入适合试卷截图、拍照题目。
- LaTeX 输入适合公式较复杂、需要精确表达的题目。

图片输入会在前端使用 Canvas 等比缩放至 2048px 以内，并转换为 base64，减少请求体积。

### 2. 多模型服务商适配

项目将不同服务商抽象为统一 Provider 配置，包含：

- 服务商名称
- 可选模型列表
- API Endpoint
- Header 构造方式
- 请求体构造方式
- 流式响应解析方式

对 OpenAI 兼容接口使用统一适配函数，对 Gemini 和 Claude 单独处理原生 API 格式，降低后续扩展新模型的成本。

### 3. 流式响应体验

主进程通过 `fetch` + `ReadableStream` 读取 SSE 响应，逐块解析 `data:` 内容，并通过 IPC 将 chunk 发送到渲染进程。

前端收到 chunk 后实时追加到助手消息中，让用户在模型生成过程中即可看到解题步骤，减少等待感。

### 4. 数学公式渲染

模型回答使用 Markdown 输出，数学公式使用 LaTeX 格式：

- 行内公式：`$...$`
- 独立公式：`$$...$$`

前端通过 `react-markdown`、`remark-math`、`rehype-katex` 和 `KaTeX` 完成公式渲染，提升数学内容的可读性。

### 5. Prompt 约束

系统 Prompt 将模型设定为“数学老师”，要求其：

- 使用中文解答数学题
- 给出详细的逐步推导过程
- 使用 LaTeX 格式输出数学公式
- 如果题目包含图片，先描述识别到的题目内容，再进行解答

## 运行方式

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 打包

```bash
npm run build
```

打包产物位于：

```text
dist/
```

## 使用说明

1. 打开应用。
2. 点击右上角设置按钮。
3. 选择服务商和模型，填写 API Key。
4. 在左侧选择输入方式：文字、图片或 LaTeX。
5. 提交题目后，在右侧查看流式生成的解题过程。

## 可展示材料

建议补充以下材料用于简历和作品集展示：

- 应用首页截图
- 文字题解答截图
- 图片题上传与解答截图
- LaTeX 公式预览截图
- 模型配置弹窗截图
- 30 秒演示视频

## 后续优化方向

- 支持复制图片后直接粘贴上传。
- 增加对话历史保存与导出。
- 增加解题步骤评分或答案可信度提示。
- 支持本地 Ollama 模型。
- 增加错题本、收藏题目和复习计划功能。
- 针对小学、初中、高中、大学数学提供不同解题风格。

## 简历关键词

AI 产品 Demo、AIGC 教育应用、多模态输入、大模型 API、Prompt 设计、流式响应、公式渲染、Electron 桌面应用、React、TypeScript。

## 权利说明

暂不授予开源许可证，保留权利；详见 [RIGHTS.md](RIGHTS.md)。
