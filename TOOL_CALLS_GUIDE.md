# Tool Calls / Function Calling 使用指南

## 🎉 功能说明

现在你的 Deno proxy 已经完整支持 OpenAI 的 `tool_calls`/`function_call` 协议！可以在 n8n 或其他 OpenAI 客户端中使用 Function Calling 功能。

---

## 🔧 支持的功能

### ✅ 已实现

1. **请求转换**：
   - OpenAI `tools` → Gemini `functionDeclarations`
   - OpenAI `tool_choice` → Gemini `functionCallingConfig`
   - OpenAI `tool` 角色消息 → Gemini `functionResponse`

2. **响应转换**：
   - Gemini `functionCall` → OpenAI `tool_calls`
   - 自动设置 `finish_reason: "tool_calls"`
   - 支持流式和非流式响应

3. **完整的对话流程**：
   - 用户消息 → AI 调用工具 → 工具返回结果 → AI 生成最终回复

---

## 📝 使用示例

### 1. 定义工具（Tools）

在 n8n 的 OpenAI Chat Model 节点中，或通过 API 调用时，定义工具：

```json
{
  "model": "gemini-flash-latest",
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in San Francisco?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "description": "The temperature unit"
            }
          },
          "required": ["location"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

### 2. AI 响应（包含 tool_calls）

AI 会返回需要调用的工具：

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gemini-flash-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": "{\"location\":\"San Francisco, CA\",\"unit\":\"fahrenheit\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

### 3. 返回工具执行结果

将工具执行结果返回给 AI：

```json
{
  "model": "gemini-flash-latest",
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in San Francisco?"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "get_weather",
            "arguments": "{\"location\":\"San Francisco, CA\",\"unit\":\"fahrenheit\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "name": "get_weather",
      "content": "{\"temperature\":72,\"condition\":\"sunny\"}"
    }
  ],
  "tools": [...]
}
```

### 4. AI 生成最终回复

AI 会基于工具结果生成最终回复：

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gemini-flash-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The weather in San Francisco is currently sunny with a temperature of 72°F."
      },
      "finish_reason": "stop"
    }
  ]
}
```

---

## 🎯 在 n8n 中使用

### 方法 1：使用 OpenAI Chat Model 节点（推荐）

1. **配置凭证**：
   - API Key: 你的 Google AI API Key
   - Base URL: `http://localhost:8000`

2. **配置节点**：
   - Model: `gemini-flash-latest`
   - Messages: 输入消息
   - **Built-in Tools**: 添加工具定义

3. **n8n 会自动处理**：
   - 工具调用
   - 工具执行
   - 结果返回
   - 最终回复生成

### 方法 2：使用 HTTP Request 节点

手动构建完整的对话流程（参考上面的示例）。

---

## 🔍 tool_choice 参数说明

| OpenAI 值 | Gemini 映射 | 说明 |
|-----------|-------------|------|
| `"none"` | `mode: "NONE"` | 不调用任何工具 |
| `"auto"` | `mode: "AUTO"` | AI 自动决定是否调用工具 |
| `"required"` | `mode: "ANY"` | 必须调用至少一个工具 |
| `{"type": "function", "function": {"name": "..."}}` | `mode: "ANY"` + `allowedFunctionNames` | 只能调用指定的工具 |

---

## 🧪 测试 API

### 测试工具调用

```bash
curl http://localhost:8000/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GOOGLE_API_KEY" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "What is 25 * 4?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "calculate",
          "description": "Perform a mathematical calculation",
          "parameters": {
            "type": "object",
            "properties": {
              "expression": {
                "type": "string",
                "description": "The mathematical expression to evaluate"
              }
            },
            "required": ["expression"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

### 测试流式响应 + 工具调用

```bash
curl http://localhost:8000/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GOOGLE_API_KEY" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"}
    ],
    "tools": [...],
    "stream": true
  }'
```

---

## 📊 协议映射对照表

### 请求格式

| OpenAI | Gemini | 说明 |
|--------|--------|------|
| `tools[].function` | `functionDeclarations[]` | 工具定义 |
| `tool_choice` | `functionCallingConfig` | 工具调用策略 |
| `messages[role="tool"]` | `parts[].functionResponse` | 工具执行结果 |

### 响应格式

| Gemini | OpenAI | 说明 |
|--------|--------|------|
| `parts[].functionCall` | `tool_calls[]` | AI 请求调用的工具 |
| `finishReason: "STOP"` | `finish_reason: "tool_calls"` | 当有 functionCall 时 |

---

## ⚠️ 注意事项

1. **模型支持**：
   - ✅ `gemini-flash-latest` - 支持 Function Calling
   - ✅ `gemini-1.5-pro-latest` - 支持 Function Calling
   - ✅ `gemini-1.5-flash` - 支持 Function Calling
   - ❌ 旧版本模型可能不支持

2. **工具定义**：
   - 必须提供 `name` 和 `parameters`
   - `parameters` 必须是有效的 JSON Schema
   - `description` 建议提供，帮助 AI 理解工具用途
   - ⚠️ **JSON Schema 兼容性**：Gemini API 不支持 `$schema`、`additionalProperties` 等字段，但 Proxy 会自动清理这些字段。详见 [JSON_SCHEMA_COMPATIBILITY.md](JSON_SCHEMA_COMPATIBILITY.md)

3. **工具结果**：
   - `role: "tool"` 消息必须包含 `tool_call_id` 和 `name`
   - `content` 可以是 JSON 字符串或对象
   - 必须在 AI 返回 `tool_calls` 后立即提供

4. **流式响应**：
   - 流式模式下，tool_calls 会在单个 chunk 中完整返回
   - 不会像文本内容那样逐字返回

---

## 🐛 故障排除

### 问题 1：AI 不调用工具

**可能原因**：
- 工具定义不清晰
- `tool_choice` 设置为 `"none"`
- 用户消息不需要工具

**解决方案**：
- 改进工具的 `description`
- 设置 `tool_choice: "required"`
- 在用户消息中明确提示需要使用工具

### 问题 2：工具调用参数错误

**可能原因**：
- JSON Schema 定义不准确
- 缺少 `required` 字段

**解决方案**：
- 完善 `parameters` 的 JSON Schema
- 明确标注 `required` 字段
- 在 `description` 中提供示例

### 问题 3：工具结果无法返回

**可能原因**：
- `tool_call_id` 不匹配
- `role: "tool"` 消息格式错误

**解决方案**：
- 确保 `tool_call_id` 与 AI 返回的 `id` 一致
- 检查消息格式是否符合 OpenAI 规范

---

## 🚀 高级用法

### 多工具调用

AI 可以在一次响应中调用多个工具：

```json
{
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {"name": "get_weather", "arguments": "..."}
    },
    {
      "id": "call_2",
      "type": "function",
      "function": {"name": "get_time", "arguments": "..."}
    }
  ]
}
```

返回结果时，需要为每个 `tool_call_id` 提供对应的结果。

### 并行工具调用

Gemini 支持并行调用多个工具，提高效率。

---

## 📚 参考资料

- [OpenAI Function Calling 文档](https://platform.openai.com/docs/guides/function-calling)
- [Gemini Function Calling 文档](https://ai.google.dev/gemini-api/docs/function-calling)
- [n8n OpenAI Chat Model 节点文档](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.lmchatopenai/)

---

## ✅ 总结

现在你的 Deno proxy 已经完整支持 OpenAI 的 tool_calls 协议！可以在 n8n 或任何 OpenAI 兼容的客户端中使用 Function Calling 功能，享受 Gemini 强大的工具调用能力！🎉
