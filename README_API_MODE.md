# Gemini Playground - API Mode Configuration

## 概述

此项目现在支持两种 API 模式：

1. **WebSocket 模式** - 用于支持 Live API 的模型（实时语音/视频对话）
2. **REST API 模式** - 用于标准 Gemini 模型（文本对话）

## 配置方法

编辑 `src/static/js/config/config.js` 文件：

### 使用 REST API 模式（gemini-flash-latest 等标准模型）

```javascript
export const CONFIG = {
    API: {
        VERSION: 'v1beta',
        MODEL_NAME: 'models/gemini-flash-latest',
        API_MODE: 'rest'  // 使用 REST API
    },
    // ...
};
```

**支持的模型**：
- `models/gemini-flash-latest`
- `models/gemini-1.5-pro-latest`
- `models/gemini-1.5-flash`
- 其他标准 Gemini 模型

**功能限制**：
- ✅ 文本对话（支持流式响应）
- ❌ 语音输入/输出
- ❌ 视频输入
- ❌ 屏幕共享

---

### 使用 WebSocket 模式（Live API 模型）

```javascript
export const CONFIG = {
    API: {
        VERSION: 'v1beta',
        MODEL_NAME: 'models/gemini-2.0-flash-exp',
        API_MODE: 'websocket'  // 使用 WebSocket Live API
    },
    // ...
};
```

**支持的模型**：
- `models/gemini-2.0-flash-exp`
- `models/gemini-exp-1206`
- 其他支持 Live API 的模型

**功能支持**：
- ✅ 文本对话
- ✅ 语音输入/输出
- ✅ 视频输入
- ✅ 屏幕共享

---

## 启动项目

### 1. 安装 Deno（如果尚未安装）

```bash
# macOS/Linux
brew install deno

# 或使用官方脚本
curl -fsSL https://deno.land/install.sh | sh
```

### 2. 启动服务器

```bash
cd /Users/liangguo/work_python/gemini-playground

# 使用 deno task
deno task start

# 或直接运行
deno run --allow-net --allow-read --allow-env src/deno_index.ts
```

### 3. 访问应用

打开浏览器访问：`http://localhost:3000`

### 4. 输入 API Key

在页面顶部输入你的 Google AI API Key，然后点击 **Connect** 按钮。

获取 API Key：https://aistudio.google.com/apikey

---

## 使用说明

### REST API 模式

1. 点击 **Connect** 连接到 API
2. 在底部输入框输入文本消息
3. 点击 **Send** 或按 **Enter** 发送
4. AI 的回复会以流式方式显示在日志区域

**注意**：麦克风、摄像头、屏幕共享按钮在此模式下不可用。

### WebSocket 模式

1. 点击 **Connect** 连接到 API
2. 可以使用以下方式与 AI 交互：
   - 文本输入：在底部输入框输入并发送
   - 语音输入：点击麦克风按钮开始语音对话
   - 视频输入：点击摄像头按钮启用视频
   - 屏幕共享：点击屏幕共享按钮分享屏幕

---

## 故障排除

### 问题：WebSocket 连接失败（code 1006）

**原因**：使用的模型不支持 Live API

**解决方案**：
1. 将 `API_MODE` 改为 `'rest'`
2. 或将 `MODEL_NAME` 改为支持 Live API 的模型（如 `gemini-2.0-flash-exp`）

### 问题：REST API 返回 404 错误

**原因**：模型名称不正确

**解决方案**：
确保 `MODEL_NAME` 使用正确的格式，例如：
- ✅ `models/gemini-flash-latest`
- ❌ `gemini-flash-latest`

### 问题：API Key 无效

**解决方案**：
1. 访问 https://aistudio.google.com/apikey 获取新的 API Key
2. 确保 API Key 有权限访问你使用的模型

---

## 技术架构

### REST API 模式

```
浏览器 → REST API Client → Google Gemini API (HTTPS + SSE)
```

- 使用 `streamGenerateContent` 端点
- 通过 Server-Sent Events (SSE) 接收流式响应
- 直接连接到 Google API，不经过 Deno 代理

### WebSocket 模式

```
浏览器 → WebSocket Client → Deno 代理 → Google Gemini Live API (WebSocket)
```

- 使用 `BidiGenerateContent` 端点
- 支持双向实时通信
- 通过 Deno 服务器代理 WebSocket 连接

---

## 文件结构

```
gemini-playground/
├── src/
│   ├── deno_index.ts                          # Deno 服务器入口
│   ├── static/
│   │   ├── index.html                         # 主页面
│   │   └── js/
│   │       ├── main.js                        # 主逻辑（已修改）
│   │       ├── config/
│   │       │   └── config.js                  # 配置文件（已修改）
│   │       └── core/
│   │           ├── websocket-client.js        # WebSocket 客户端
│   │           └── rest-client.js             # REST API 客户端（新增）
│   └── api_proxy/
│       └── worker.mjs                         # API 代理
└── README_API_MODE.md                         # 本文档
```

---

## 开发建议

### 切换模式

只需修改 `config.js` 中的两个参数：

```javascript
// REST API 模式
MODEL_NAME: 'models/gemini-flash-latest',
API_MODE: 'rest'

// WebSocket 模式
MODEL_NAME: 'models/gemini-2.0-flash-exp',
API_MODE: 'websocket'
```

修改后刷新浏览器即可生效，无需重启服务器。

### 添加新功能

- REST API 客户端：编辑 `src/static/js/core/rest-client.js`
- WebSocket 客户端：编辑 `src/static/js/core/websocket-client.js`
- 主逻辑：编辑 `src/static/js/main.js`

---

## 许可证

MIT License - 详见项目根目录的 LICENSE 文件
