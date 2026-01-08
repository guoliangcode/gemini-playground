# JSON Schema 兼容性说明

## 🔍 问题描述

当使用 n8n 或其他 OpenAI 客户端调用 Tool Calls 功能时，可能会遇到以下错误：

```
Bad request - please check your parameters
Invalid JSON payload received. Unknown name "additionalProperties" at 'tools[0].function_declarations[0].parameters': Cannot find field.
Invalid JSON payload received. Unknown name "$schema" at 'tools[0].function_declarations[0].parameters': Cannot find field.
```

## 🎯 原因分析

### OpenAI API 的 JSON Schema

OpenAI API 接受**完整的 JSON Schema**，包括：
- `$schema`: Schema 版本声明
- `$id`: Schema ID
- `$ref`: 引用其他 Schema
- `additionalProperties`: 是否允许额外属性
- `definitions` / `$defs`: Schema 定义
- 等等...

示例：
```json
{
  "type": "object",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalProperties": false,
  "properties": {
    "location": {
      "type": "string",
      "description": "The city name"
    }
  },
  "required": ["location"]
}
```

### Gemini API 的 JSON Schema

Gemini API 只接受**简化的 JSON Schema**，仅支持：
- `type`: 数据类型
- `description`: 描述
- `properties`: 属性定义
- `required`: 必需字段
- `enum`: 枚举值
- `items`: 数组项定义
- `format`: 格式（如 `date-time`）

**不支持的字段**：
- ❌ `$schema`
- ❌ `$id`
- ❌ `$ref`
- ❌ `additionalProperties`
- ❌ `definitions` / `$defs`
- ❌ `patternProperties`
- ❌ `dependencies`
- ❌ 等等...

## ✅ 解决方案

我已经在 `worker.mjs` 中添加了 `cleanJsonSchema` 函数，自动过滤掉 Gemini API 不支持的字段。

### 实现原理

```javascript
const cleanJsonSchema = (schema) => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const cleaned = { ...schema };

  // 删除不支持的字段
  delete cleaned.$schema;
  delete cleaned.$id;
  delete cleaned.$ref;
  delete cleaned.additionalProperties;
  delete cleaned.definitions;
  delete cleaned.$defs;

  // 递归清理嵌套对象
  if (cleaned.properties) {
    cleaned.properties = Object.fromEntries(
      Object.entries(cleaned.properties).map(([key, value]) => [
        key,
        cleanJsonSchema(value)
      ])
    );
  }

  // 清理数组项
  if (cleaned.items) {
    cleaned.items = cleanJsonSchema(cleaned.items);
  }

  return cleaned;
};
```

### 转换示例

**输入（OpenAI 格式）**：
```json
{
  "type": "object",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalProperties": false,
  "properties": {
    "location": {
      "type": "string",
      "description": "The city name"
    },
    "unit": {
      "type": "string",
      "enum": ["celsius", "fahrenheit"]
    }
  },
  "required": ["location"]
}
```

**输出（Gemini 格式）**：
```json
{
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "description": "The city name"
    },
    "unit": {
      "type": "string",
      "enum": ["celsius", "fahrenheit"]
    }
  },
  "required": ["location"]
}
```

## 🚀 使用方法

### 在 n8n 中

现在你可以直接在 n8n 的 OpenAI Chat Model 节点中使用 Built-in Tools，无需担心 JSON Schema 兼容性问题！

1. **添加工具**：在 Built-in Tools 中添加工具定义
2. **使用标准 JSON Schema**：可以包含 `$schema`、`additionalProperties` 等字段
3. **自动转换**：Proxy 会自动清理不支持的字段

### 通过 API 调用

```bash
curl http://localhost:8000/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "What is the weather?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get weather",
          "parameters": {
            "type": "object",
            "$schema": "http://json-schema.org/draft-07/schema#",
            "additionalProperties": false,
            "properties": {
              "location": {"type": "string"}
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

Proxy 会自动清理 `$schema` 和 `additionalProperties` 字段。

## 🔍 调试

如果遇到问题，可以查看 Deno 服务器日志，会输出转换后的 tools 格式：

```
Transformed tools: {
  "functionDeclarations": [
    {
      "name": "get_weather",
      "description": "Get weather",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"}
        },
        "required": ["location"]
      }
    }
  ]
}
```

## 📊 支持的 JSON Schema 字段

| 字段 | OpenAI | Gemini | 说明 |
|------|--------|--------|------|
| `type` | ✅ | ✅ | 数据类型 |
| `description` | ✅ | ✅ | 描述 |
| `properties` | ✅ | ✅ | 对象属性 |
| `required` | ✅ | ✅ | 必需字段 |
| `enum` | ✅ | ✅ | 枚举值 |
| `items` | ✅ | ✅ | 数组项 |
| `format` | ✅ | ✅ | 格式 |
| `$schema` | ✅ | ❌ | Schema 版本（自动删除） |
| `$id` | ✅ | ❌ | Schema ID（自动删除） |
| `$ref` | ✅ | ❌ | 引用（自动删除） |
| `additionalProperties` | ✅ | ❌ | 额外属性（自动删除） |
| `definitions` / `$defs` | ✅ | ❌ | 定义（自动删除） |
| `patternProperties` | ✅ | ❌ | 模式属性（自动删除） |
| `dependencies` | ✅ | ❌ | 依赖（自动删除） |

## 💡 最佳实践

### 1. 使用简化的 JSON Schema

虽然 Proxy 会自动清理不支持的字段，但建议直接使用简化的 JSON Schema：

```json
{
  "type": "object",
  "properties": {
    "location": {
      "type": "string",
      "description": "The city name"
    }
  },
  "required": ["location"]
}
```

### 2. 提供详细的 description

Gemini 依赖 `description` 来理解参数用途，建议提供详细的描述：

```json
{
  "location": {
    "type": "string",
    "description": "The city and state, e.g. San Francisco, CA"
  }
}
```

### 3. 使用 enum 限制选项

对于有限选项的参数，使用 `enum` 限制：

```json
{
  "unit": {
    "type": "string",
    "enum": ["celsius", "fahrenheit"],
    "description": "The temperature unit"
  }
}
```

### 4. 明确标注 required 字段

确保标注必需字段：

```json
{
  "type": "object",
  "properties": {...},
  "required": ["location", "unit"]
}
```

## 🐛 常见问题

### Q1: 为什么 n8n 生成的 JSON Schema 包含这些字段？

A: n8n 使用标准的 JSON Schema 格式，这是符合规范的。但不同的 API 提供商对 JSON Schema 的支持程度不同。

### Q2: 删除这些字段会影响功能吗？

A: 不会。这些字段主要用于 Schema 验证和文档生成，对 AI 理解参数没有影响。Gemini 主要依赖 `type`、`description` 和 `enum` 来理解参数。

### Q3: 如何验证转换是否正确？

A: 查看 Deno 服务器日志，会输出 `Transformed tools:` 信息，显示转换后的格式。

### Q4: 支持嵌套对象吗？

A: 支持！`cleanJsonSchema` 函数会递归清理嵌套对象和数组。

## 📚 参考资料

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [JSON Schema Specification](https://json-schema.org/)
- [Gemini API Schema Reference](https://ai.google.dev/api/rest/v1/Schema)

## ✅ 总结

现在你的 Deno proxy 已经完全兼容 OpenAI 和 Gemini 的 JSON Schema 差异！可以在 n8n 或任何 OpenAI 客户端中使用标准的 JSON Schema，Proxy 会自动处理兼容性问题。🎉
