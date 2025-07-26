#!/usr/bin/env node

// 部署辅助脚本 - 显示部署说明
console.log('🤖 X Media Bot 部署指南\n');

console.log('📋 部署步骤:');
console.log('1. 创建 Telegram Bot:');
console.log('   - 在 Telegram 中找到 @BotFather');
console.log('   - 发送 /newbot 创建机器人');
console.log('   - 保存获得的 Bot Token\n');

console.log('2. 配置环境:');
console.log('   npm install');
console.log('   wrangler secret put BOT_TOKEN');
console.log('   # 输入你的 Bot Token\n');

console.log('3. 部署到 Cloudflare:');
console.log('   npm run deploy\n');

console.log('4. 设置 Webhook:');
console.log('   # 替换 YOUR_BOT_TOKEN 和 your-worker-name');
console.log('   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \\');
console.log('        -H "Content-Type: application/json" \\');
console.log('        -d \'{"url": "https://your-worker-name.your-subdomain.workers.dev/webhook"}\'');

console.log('\n✅ 完成后，机器人就可以使用了！');
console.log('💡 发送包含 Twitter/X 链接的消息给机器人测试功能');