# 故障排除指南

## 机器人无响应的常见原因

### 1. 检查 Bot Token 配置

```bash
# 检查是否正确设置了 Bot Token
wrangler secret list

# 如果没有，重新设置
wrangler secret put BOT_TOKEN
```

### 2. 检查 Webhook 设置

运行测试脚本检查 Webhook 状态：
```bash
npm run test
```

或手动检查：
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### 3. 设置正确的 Webhook URL

```bash
# 替换 YOUR_BOT_TOKEN 和 your-worker-name
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-worker-name.your-subdomain.workers.dev/webhook"}'
```

### 4. 检查 Worker 部署状态

```bash
# 查看 Worker 日志
wrangler tail

# 重新部署
npm run deploy
```

### 5. 测试 Worker 是否运行

访问你的 Worker URL（不带 /webhook），应该看到：
```
Twitter Video Bot is running!
```

### 6. 常见错误解决

#### Bot Token 无效
- 确认从 @BotFather 获取的 Token 正确
- Token 格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

#### Webhook 设置失败
- 确认 Worker URL 正确且可访问
- URL 必须是 HTTPS
- 检查域名拼写

#### Worker 部署失败
```bash
# 检查 wrangler 配置
wrangler whoami

# 重新登录
wrangler login
```

### 7. 调试步骤

1. **发送 /start 命令**：机器人应该回复欢迎消息
2. **发送普通文本**：机器人应该提示需要 Twitter 链接
3. **发送 Twitter 链接**：机器人应该处理并提取视频
4. **查看日志**：`wrangler tail` 查看实时日志

### 8. 测试用的 Twitter 链接

```
https://x.com/eddie_pete74061/status/1948344587774513407
```

### 9. 手动测试 API

测试 fxtwitter：
```bash
curl "https://api.fxtwitter.com/eddie_pete74061/status/1948344587774513407"
```

测试 vxtwitter：
```bash
curl "https://api.vxtwitter.com/eddie_pete74061/status/1948344587774513407"
```

### 10. 联系支持

如果以上步骤都无法解决问题，请提供：
- Bot Token（前10位）
- Worker URL
- 错误日志
- 测试步骤和结果