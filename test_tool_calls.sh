#!/bin/bash

# Tool Calls 测试脚本
# 使用方法: ./test_tool_calls.sh YOUR_API_KEY

API_KEY="${1:-YOUR_API_KEY}"
BASE_URL="http://localhost:8000"

echo "🧪 测试 OpenAI Tool Calls 功能"
echo "================================"
echo ""

# 测试 1: 简单的工具调用
echo "📝 测试 1: 简单的数学计算工具调用"
echo "--------------------------------"
curl -s "${BASE_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
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
  }' | jq '.'

echo ""
echo ""

# 测试 2: 天气查询工具
echo "📝 测试 2: 天气查询工具调用"
echo "--------------------------------"
curl -s "${BASE_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "What is the weather like in Tokyo?"}
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
                "description": "The city name, e.g. Tokyo, San Francisco"
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
  }' | jq '.'

echo ""
echo ""

# 测试 3: 多工具定义
echo "📝 测试 3: 多工具定义（AI 选择合适的工具）"
echo "--------------------------------"
curl -s "${BASE_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "Search for information about Gemini AI"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "web_search",
          "description": "Search the web for information",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "The search query"
              }
            },
            "required": ["query"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string"}
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }' | jq '.'

echo ""
echo ""

# 测试 4: 强制工具调用
echo "📝 测试 4: 强制工具调用 (tool_choice: required)"
echo "--------------------------------"
curl -s "${BASE_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gemini-flash-latest",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_greeting",
          "description": "Get a greeting message",
          "parameters": {
            "type": "object",
            "properties": {
              "language": {
                "type": "string",
                "description": "The language for the greeting"
              }
            }
          }
        }
      }
    ],
    "tool_choice": "required"
  }' | jq '.'

echo ""
echo ""
echo "✅ 测试完成！"
echo ""
echo "💡 提示："
echo "  - 如果看到 tool_calls 字段，说明工具调用功能正常"
echo "  - finish_reason 应该是 'tool_calls'"
echo "  - 你可以将 tool_calls 的结果返回给 AI 以获得最终回复"
