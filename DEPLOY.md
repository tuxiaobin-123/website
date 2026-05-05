# 公网部署说明

这是个人 AI 恋爱沟通教练的私有部署版本。公网部署前必须做到三件事：

1. 不上传 `.env`。
2. 不上传 `data/profile.json`、`data/timeline.json` 等个人数据。
3. 设置 `PUBLIC_AUTH_USER` 和 `PUBLIC_AUTH_PASSWORD`，否则任何拿到链接的人都能打开。

## 推荐部署方式

优先选择支持 Node.js 或 Docker 的平台，例如 Railway、Render、Fly.io、云服务器。这个项目是一个 Node HTTP 服务，启动命令是：

```bash
npm start
```

## Render Blueprint 自动部署

仓库根目录已经包含 `render.yaml`。在 Render 里选择 Blueprint 或连接这个仓库时，Render 可以读取该文件创建 Web Service。

`render.yaml` 已经写入非敏感配置：

```bash
HOST=0.0.0.0
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

这些敏感值不会提交到 GitHub，需要你在 Render 页面手动填写：

```bash
DEEPSEEK_API_KEY
PUBLIC_AUTH_USER
PUBLIC_AUTH_PASSWORD
```

## 必填环境变量

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
HOST=0.0.0.0
PORT=8765
PUBLIC_AUTH_USER=你自己的登录名
PUBLIC_AUTH_PASSWORD=一个足够长的密码
```

平台如果自动分配 `PORT`，保留平台提供的 `PORT` 即可，不要强行写死。

## 上传到 GitHub 前检查

确认这些文件不会被提交：

```bash
.env
data/profile.json
data/relationship.json
data/timeline.json
data/language-library.json
data/forbidden-expressions.json
```

项目的 `.gitignore` 和 `.dockerignore` 已经排除了这些文件。

## Docker 本地预演

```bash
docker build -t dating-chat-guide .
docker run --rm -p 8765:8765 ^
  -e HOST=0.0.0.0 ^
  -e PORT=8765 ^
  -e AI_PROVIDER=deepseek ^
  -e DEEPSEEK_API_KEY=你的 DeepSeek Key ^
  -e PUBLIC_AUTH_USER=demo ^
  -e PUBLIC_AUTH_PASSWORD=change-this-password ^
  dating-chat-guide
```

打开：

```text
http://127.0.0.1:8765/index.html
```

浏览器会弹出登录框，输入 `PUBLIC_AUTH_USER` 和 `PUBLIC_AUTH_PASSWORD`。
