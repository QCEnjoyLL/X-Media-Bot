// X Media Bot for Telegram
// 使用 fxtwitter 和 vxtwitter API 提取视频和图片

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/webhook') {
      return handleTelegramWebhook(request, env);
    }

    // 设置 Webhook 的路径
    if (url.pathname === '/setup-webhook') {
      return setupWebhook(request, env);
    }

    // 主页显示状态和设置链接
    const workerUrl = url.origin;
    return new Response(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>X Media Bot</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          .btn { background: #0088cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .btn:hover { background: #006699; }
        </style>
      </head>
      <body>
        <h1>🤖 X Media Bot</h1>
        <p>Bot is running!</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>BOT_TOKEN configured: ${env.BOT_TOKEN ? 'YES' : 'NO'}</p>
        
        <h2>🔧 Setup</h2>
        ${env.BOT_TOKEN ? `
          <p>Webhook URL: <code>${workerUrl}/webhook</code></p>
          <p><a href="/setup-webhook" class="btn">🚀 设置 Webhook</a></p>
        ` : `
          <p>请先配置 BOT_TOKEN: <code>wrangler secret put BOT_TOKEN</code></p>
        `}
      </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
};

async function handleTelegramWebhook(request, env) {
  try {
    const update = await request.json();
    console.log('Received update:', JSON.stringify(update));

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const messageText = update.message.text;

      console.log(`Message from ${chatId}: ${messageText}`);

      // 处理 /start 命令
      if (messageText === '/start') {
        await sendMessage(chatId, '🤖 X Media Bot 已启动！\n\n发送包含 Twitter/X 链接的消息，我会帮你提取视频和图片。\n\n支持的链接格式：\n• https://twitter.com/username/status/123\n• https://x.com/username/status/123', env);
        return new Response('OK', { status: 200 });
      }

      // 检查是否包含 Twitter/X 链接
      const twitterUrls = extractTwitterUrls(messageText);

      if (twitterUrls.length > 0) {
        console.log('Found Twitter URLs:', twitterUrls);
        await sendMessage(chatId, '🔍 检测到 Twitter 链接，正在处理...', env);

        for (const twitterUrl of twitterUrls) {
          await processTwitterUrl(twitterUrl, chatId, env);
        }
      } else {
        // 如果没有找到 Twitter 链接，给出提示
        await sendMessage(chatId, '❌ 未检测到 Twitter/X 链接。\n\n请发送包含以下格式的链接：\n• https://twitter.com/username/status/123\n• https://x.com/username/status/123', env);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

function extractTwitterUrls(text) {
  const twitterRegex = /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/g;
  return text.match(twitterRegex) || [];
}

async function processTwitterUrl(originalUrl, chatId, env) {
  try {
    console.log('Processing URL:', originalUrl);

    // 从原始 URL 提取用户名和状态 ID
    const urlMatch = originalUrl.match(/https?:\/\/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);
    if (!urlMatch) {
      await sendMessage(chatId, '无法解析 Twitter 链接', env);
      return;
    }

    const [, username, statusId] = urlMatch;
    console.log(`Extracted: username=${username}, statusId=${statusId}`);

    // 优先使用 fxtwitter API（支持多种清晰度）
    console.log(`Fetching from fxtwitter: ${username}/${statusId}`);
    await sendMessage(chatId, '🔄 正在从 fxtwitter 获取资源（支持多清晰度）...', env);

    let mediaData = await fetchFromFxTwitter(username, statusId);
    console.log('FxTwitter result:', mediaData ? 'SUCCESS' : 'FAILED');

    // 如果 fxtwitter 失败，尝试 vxtwitter（仅最高画质）
    if (!mediaData) {
      console.log(`Fetching from vxtwitter: ${username}/${statusId}`);
      await sendMessage(chatId, '🔄 尝试 vxtwitter API（最高画质）...', env);
      mediaData = await fetchFromVxTwitter(username, statusId);
      console.log('VxTwitter result:', mediaData ? 'SUCCESS' : 'FAILED');
    }

    if (mediaData) {
      console.log('Sending media response:', mediaData);
      await sendMediaResponse(chatId, mediaData, env);
    } else {
      console.log('No media data found from both APIs');
      await sendMessage(chatId, '❌ 未找到媒体内容或获取失败\n\n可能原因：\n• 推文不包含视频或图片\n• 推文已被删除\n• API 暂时不可用', env);
    }

  } catch (error) {
    console.error('Error processing Twitter URL:', error);
    await sendMessage(chatId, `❌ 处理链接时出错: ${error.message}`, env);
  }
}

async function fetchFromFxTwitter(username, statusId) {
  try {
    const apiUrl = `https://api.fxtwitter.com/${username}/status/${statusId}`;
    console.log('FxTwitter API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('FxTwitter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('FxTwitter API failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('FxTwitter API response keys:', Object.keys(data));

    // 检查推文内容
    if (data.tweet) {
      const tweet = data.tweet;
      const baseData = {
        text: tweet.text || '',
        author: tweet.author?.name || username,
        source: 'fxtwitter'
      };

      let videos = [];
      let photos = [];

      // 检查媒体内容
      if (tweet.media) {
        const media = tweet.media;
        console.log('Media structure:', Object.keys(media));

        // 收集视频 - 直接使用所有视频，简单去重
        if (media.videos && media.videos.length > 0) {
          console.log('Found videos:', media.videos.length);

          // 使用 Map 来去重，基于完整 URL
          const uniqueVideos = new Map();

          media.videos.forEach(video => {
            if (video.url && !uniqueVideos.has(video.url)) {
              uniqueVideos.set(video.url, {
                url: video.url,
                thumbnailUrl: video.thumbnail_url,
                quality: `${video.width}x${video.height}`,
                duration: video.duration ? `${Math.round(video.duration)}秒` : '未知',
                variants: video.variants ? video.variants
                  .filter(variant => variant.content_type === 'video/mp4')
                  .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0)) : []
              });
            }
          });

          videos = Array.from(uniqueVideos.values());
          console.log('Unique videos after deduplication:', videos.length);
          console.log('Videos with variants:', videos.filter(v => v.variants.length > 0).length);
        }

        // 收集图片 - 直接使用 photos 标签，避免重复
        if (media.photos && media.photos.length > 0) {
          console.log('Found photos:', media.photos.length);

          // 使用 Set 来去重，基于 URL
          const uniquePhotos = new Map();

          media.photos.forEach(photo => {
            if (photo.url && !uniquePhotos.has(photo.url)) {
              uniquePhotos.set(photo.url, {
                url: photo.url,
                width: photo.width,
                height: photo.height
              });
            }
          });

          photos = Array.from(uniquePhotos.values());
          console.log('Unique photos after deduplication:', photos.length);
        }
      }

      // 根据媒体内容返回不同类型
      if (videos.length > 0 && photos.length > 0) {
        // 情况4: 既有视频也有图片
        return {
          type: 'mixed',
          videos: videos,
          photos: photos,
          ...baseData
        };
      } else if (videos.length > 0) {
        // 情况3: 只有视频
        return {
          type: 'videos',
          videos: videos,
          ...baseData
        };
      } else if (photos.length > 0) {
        // 情况2: 只有图片
        return {
          type: 'photos',
          photos: photos,
          ...baseData
        };
      } else {
        // 情况1: 既没有图片也没有视频
        return {
          type: 'text',
          ...baseData
        };
      }
    }

    return null;
  } catch (error) {
    console.error('FxTwitter API error:', error);
    return null;
  }
}

async function fetchFromVxTwitter(username, statusId) {
  try {
    const apiUrl = `https://api.vxtwitter.com/${username}/status/${statusId}`;
    console.log('VxTwitter API URL:', apiUrl);

    const response = await fetch(apiUrl);
    console.log('VxTwitter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('VxTwitter API failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('VxTwitter API response keys:', Object.keys(data));

    // 检查推文内容
    const baseData = {
      text: data.text || '',
      author: data.user_name || username,
      source: 'vxtwitter'
    };

    let videos = [];
    let photos = [];

    // 检查媒体内容
    if (data.media_extended && data.media_extended.length > 0) {
      console.log('Found media_extended:', data.media_extended.length);

      // 收集视频 - 收集所有视频并去重
      const videoMedia = data.media_extended.filter(media =>
        media.type === 'video' && media.url
      );

      if (videoMedia.length > 0) {
        console.log('Found video media:', videoMedia.length);

        // 使用 Map 来去重，基于 URL
        const uniqueVideos = new Map();

        videoMedia.forEach(video => {
          if (video.url && !uniqueVideos.has(video.url)) {
            uniqueVideos.set(video.url, {
              url: video.url,
              thumbnailUrl: video.thumbnail_url,
              quality: video.width && video.height ? `${video.width}x${video.height}` : 'unknown',
              duration: video.duration ? `${Math.round(video.duration)}秒` : '未知'
            });
          }
        });

        videos = Array.from(uniqueVideos.values());
        console.log('Unique videos after deduplication:', videos.length);
      }

      // 收集图片 - 使用去重逻辑
      const photoMedia = data.media_extended.filter(media =>
        media.type === 'image' && media.url
      );

      if (photoMedia.length > 0) {
        console.log('Found photo media:', photoMedia.length);

        // 使用 Set 来去重，基于 URL
        const uniquePhotos = new Map();

        photoMedia.forEach(photo => {
          if (photo.url && !uniquePhotos.has(photo.url)) {
            uniquePhotos.set(photo.url, {
              url: photo.url,
              width: photo.width,
              height: photo.height
            });
          }
        });

        photos = Array.from(uniquePhotos.values());
        console.log('Unique photos after deduplication:', photos.length);
      }
    }

    // 根据媒体内容返回不同类型
    if (videos.length > 0 && photos.length > 0) {
      // 情况4: 既有视频也有图片
      return {
        type: 'mixed',
        videos: videos,
        photos: photos,
        ...baseData
      };
    } else if (videos.length > 0) {
      // 情况3: 只有视频
      return {
        type: 'videos',
        videos: videos,
        ...baseData
      };
    } else if (photos.length > 0) {
      // 情况2: 只有图片
      return {
        type: 'photos',
        photos: photos,
        ...baseData
      };
    } else {
      // 情况1: 既没有图片也没有视频
      return {
        type: 'text',
        ...baseData
      };
    }

  } catch (error) {
    console.error('VxTwitter API error:', error);
    return null;
  }
}

async function sendMediaResponse(chatId, mediaData, env) {
  try {
    const baseText = `📄 资源提取成功\n` +
      `👤 作者: ${mediaData.author}\n` +
      `🔗 来源: ${mediaData.source}\n\n` +
      `💬 内容: ${mediaData.text.substring(0, 200)}${mediaData.text.length > 200 ? '...' : ''}`;

    if (mediaData.type === 'text') {
      // 情况1: 既没有图片也没有视频，直接返回帖文
      await sendMessage(chatId, baseText, env);

    } else if (mediaData.type === 'photos') {
      // 情况2: 只有图片，先返回帖文，再分别发送图片
      await sendMessage(chatId, baseText, env);

      // 发送所有图片
      for (let i = 0; i < mediaData.photos.length; i++) {
        const photo = mediaData.photos[i];
        const caption = `📸 图片 ${i + 1}/${mediaData.photos.length}`;

        await sendPhoto(chatId, photo.url, caption, env);

        // 添加小延迟避免发送过快
        if (i < mediaData.photos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } else if (mediaData.type === 'videos') {
      // 情况3: 只有视频，先发送预览图，再依次发送视频链接
      const videoCaption = `📹 视频资源\n` +
        `👤 作者: ${mediaData.author}\n` +
        `� 视频:数量: ${mediaData.videos.length}\n` +
        `🔗 来源: ${mediaData.source}\n\n` +
        `� 内容:  ${mediaData.text.substring(0, 200)}${mediaData.text.length > 200 ? '...' : ''}`;

      // 先发送基本信息
      await sendMessage(chatId, videoCaption, env);

      // 发送所有视频的封面图
      for (let i = 0; i < mediaData.videos.length; i++) {
        const video = mediaData.videos[i];
        if (video.thumbnailUrl) {
          const thumbnailCaption = `📸 视频封面 ${i + 1}/${mediaData.videos.length}\n📐 质量: ${video.quality}\n⏱️ 时长: ${video.duration}`;
          await sendPhoto(chatId, video.thumbnailUrl, thumbnailCaption, env);

          // 添加小延迟避免发送过快
          if (i < mediaData.videos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      // 依次发送所有视频链接
      for (let i = 0; i < mediaData.videos.length; i++) {
        const video = mediaData.videos[i];
        let caption = `🎬 视频 ${i + 1}/${mediaData.videos.length}\n📐 质量: ${video.quality}\n⏱️ 时长: ${video.duration}\n`;

        // 如果有多种清晰度选择（fxtwitter API 的优势）
        if (video.variants && video.variants.length > 0) {
          caption += `\n📱 多清晰度选择：\n`;
          video.variants.forEach((variant, index) => {
            const bitrate = variant.bitrate ? `${Math.round(variant.bitrate / 1000)}k` : '未知';
            caption += `${index + 1}. ${bitrate} - ${variant.url}\n`;
          });
        } else {
          caption += `🔗 链接: ${video.url}`;
        }

        await sendMessage(chatId, caption, env);

        // 添加小延迟避免发送过快
        if (i < mediaData.videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } else if (mediaData.type === 'mixed') {
      // 情况4: 既有图片也有视频，返回视频封面+帖文，再分别发送视频和图片
      const mixedCaption = `📹 混合资源 (视频+图片)\n` +
        `👤 作者: ${mediaData.author}\n` +
        `📊 视频数量: ${mediaData.videos.length}\n` +
        `📊 图片数量: ${mediaData.photos.length}\n` +
        `🔗 来源: ${mediaData.source}\n\n` +
        `💬 内容: ${mediaData.text.substring(0, 200)}${mediaData.text.length > 200 ? '...' : ''}`;

      // 先发送基本信息
      await sendMessage(chatId, mixedCaption, env);

      // 发送所有视频的封面图
      for (let i = 0; i < mediaData.videos.length; i++) {
        const video = mediaData.videos[i];
        if (video.thumbnailUrl) {
          const thumbnailCaption = `📸 视频封面 ${i + 1}/${mediaData.videos.length}\n📐 质量: ${video.quality}\n⏱️ 时长: ${video.duration}`;
          await sendPhoto(chatId, video.thumbnailUrl, thumbnailCaption, env);

          // 添加小延迟避免发送过快
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 依次发送所有视频链接
      for (let i = 0; i < mediaData.videos.length; i++) {
        const video = mediaData.videos[i];
        let caption = `🎬 视频 ${i + 1}/${mediaData.videos.length}\n📐 质量: ${video.quality}\n⏱️ 时长: ${video.duration}\n`;

        // 如果有多种清晰度选择（fxtwitter API 的优势）
        if (video.variants && video.variants.length > 0) {
          caption += `\n📱 多清晰度选择：\n`;
          video.variants.forEach((variant, index) => {
            const bitrate = variant.bitrate ? `${Math.round(variant.bitrate / 1000)}k` : '未知';
            caption += `${index + 1}. ${bitrate} - ${variant.url}\n`;
          });
        } else {
          caption += `🔗 链接: ${video.url}`;
        }

        await sendMessage(chatId, caption, env);

        // 添加小延迟避免发送过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 发送所有图片
      for (let i = 0; i < mediaData.photos.length; i++) {
        const photo = mediaData.photos[i];
        const caption = `📸 图片 ${i + 1}/${mediaData.photos.length}`;

        await sendPhoto(chatId, photo.url, caption, env);

        // 添加小延迟避免发送过快
        if (i < mediaData.photos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

  } catch (error) {
    console.error('Error sending media response:', error);
    await sendMessage(chatId, '发送资源信息时出错', env);
  }
}

async function sendPhoto(chatId, photoUrl, caption, env) {
  try {
    const botToken = env.BOT_TOKEN;
    if (!botToken) {
      console.error('BOT_TOKEN not configured');
      return false;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    console.log(`Sending photo to ${chatId}: ${photoUrl}`);

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram sendPhoto API error:', response.status, errorText);
      // 如果发送图片失败，回退到发送文本
      console.log('Falling back to text message');
      return await sendMessage(chatId, caption, env);
    }

    console.log('Photo sent successfully');
    return true;

  } catch (error) {
    console.error('Error sending photo:', error);
    // 如果发送图片失败，回退到发送文本
    return await sendMessage(chatId, caption, env);
  }
}

async function sendMessage(chatId, text, env) {
  try {
    const botToken = env.BOT_TOKEN;
    if (!botToken) {
      console.error('BOT_TOKEN not configured');
      return false;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    console.log(`Sending message to ${chatId}: ${text.substring(0, 100)}...`);

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', response.status, errorText);
      return false;
    }

    console.log('Message sent successfully');
    return true;

  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

async function setupWebhook(request, env) {
  try {
    if (!env.BOT_TOKEN) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>配置错误</title>
        </head>
        <body>
          <h1>❌ BOT_TOKEN 未配置</h1>
          <p>请运行: <code>wrangler secret put BOT_TOKEN</code></p>
          <a href="/">返回</a>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/webhook`;

    const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl
      })
    });

    const result = await response.json();

    if (result.ok) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>设置成功</title>
        </head>
        <body>
          <h1>✅ Webhook 设置成功！</h1>
          <p>Webhook URL: <code>${webhookUrl}</code></p>
          <p>现在可以在 Telegram 中测试机器人了</p>
          <a href="/">返回</a>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } else {
      return new Response(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>设置失败</title>
        </head>
        <body>
          <h1>❌ Webhook 设置失败</h1>
          <p>错误: ${result.description}</p>
          <a href="/">返回</a>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

  } catch (error) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>设置错误</title>
      </head>
      <body>
        <h1>❌ 设置过程中出错</h1>
        <p>错误: ${error.message}</p>
        <a href="/">返回</a>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}