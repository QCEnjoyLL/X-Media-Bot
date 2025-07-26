# X Media Bot

一个运行在 Cloudflare Workers 上的 Telegram 机器人，用于提取 Twitter/X 上的视频和图片。

## ✨ 功能特点

- 🎬 自动提取 Twitter/X 链接中的视频和图片
- 📱 支持多种分辨率视频（fxtwitter API）
- 🔄 双重 API 保障（fxtwitter + vxtwitter）
- ⚡ 基于 Cloudflare Workers，响应快速
- 🆓 免费部署和运行
- 🌐 支持中文界面

## 🚀 快速开始

### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 保存获得的 Bot Token

### 2. 部署到 Cloudflare

```bash
# 克隆项目
git clone <your-repo-url>
cd x-media-bot

# 安装依赖
npm install

# 配置 Bot Token
wrangler secret put BOT_TOKEN
# 输入你的 Bot Token

# 部署
npm run deploy
```

### 3. 设置 Webhook

部署成功后，访问你的 Worker URL 并点击"设置 Webhook"按钮，或手动设置：

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-worker-name.your-subdomain.workers.dev/webhook"}'
```

## 📱 使用方法

1. 在 Telegram 中找到你的机器人
2. 发送 `/start` 开始使用
3. 发送包含 Twitter/X 链接的消息
4. 机器人会自动提取并发送视频/图片

### 支持的链接格式

- `https://twitter.com/username/status/1234567890`
- `https://x.com/username/status/1234567890`

## 🛠️ 开发

### 本地开发

```bash
# 本地运行
npm run dev

# 测试机器人
npm run test

# 测试 API
npm run test-apis
```

### 可用脚本

- `npm run dev` - 本地开发模式
- `npm run deploy` - 部署到生产环境
- `npm run debug` - 调试模式部署
- `npm run logs` - 查看运行日志
- `npm run test` - 测试机器人功能
- `npm run setup` - 显示部署指南

## 🔧 配置

### 环境变量

- `BOT_TOKEN` - Telegram Bot Token（必需）

### Wrangler 配置

项目使用 `wrangler.toml` 进行配置，主要设置：

- `name` - Worker 名称
- `main` - 入口文件
- `compatibility_date` - 兼容性日期

## 📋 API 说明

### FxTwitter API（优先）

- 提供多种分辨率选择
- 更丰富的媒体信息
- 格式：`https://api.fxtwitter.com/username/status/statusId`

### VxTwitter API（备用）

- 备用 API，确保服务稳定性
- 格式：`https://api.vxtwitter.com/username/status/statusId`

## 🎯 功能展示

机器人支持以下内容类型：

1. **纯文本推文** - 显示推文内容
2. **图片推文** - 发送所有图片
3. **视频推文** - 发送视频封面和多清晰度链接
4. **混合推文** - 同时包含视频和图片

## ⚠️ 注意事项

- 确保 Bot Token 安全，使用 `wrangler secret` 管理
- Cloudflare Workers 有请求限制，注意使用量
- 某些私有或受保护的推文可能无法访问
- 大文件建议直接发送链接而非文件本身

## 🐛 故障排除

### 常见问题

1. **机器人无响应**
   - 检查 Webhook 是否正确设置
   - 确认 Worker 部署成功

2. **Token 错误**
   - 确认 Bot Token 正确配置
   - 检查 `wrangler secret list` 输出

3. **API 失败**
   - 检查网络连接
   - 查看 Worker 日志：`npm run logs`

### 调试模式

```bash
# 使用调试配置部署
npm run debug

# 查看详细日志
npm run logs
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请：

1. 查看 [故障排除](#-故障排除) 部分
2. 提交 [Issue](../../issues)
3. 查看项目 [Wiki](../../wiki)

---

⭐ 如果这个项目对你有帮助，请给个 Star！