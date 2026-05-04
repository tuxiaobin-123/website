# Dating Chat Guide

Private AI dating communication coach for practicing calmer, clearer, and more respectful conversations.

## Features

- DeepSeek or OpenAI backend integration
- AI chat review and next-message generation
- Feedback loop after using a suggested message
- Cold-start insights before enough review data exists
- Local profile, relationship notes, timeline, language library, and forbidden expression list
- Deployment-ready Node server with optional Basic Auth

## Local Start

1. Copy `.env.example` to `.env`.
2. Fill in `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`.
3. Run:

```bash
npm start
```

Open:

```text
http://127.0.0.1:8765/index.html
```

## Public Deployment

Read [DEPLOY.md](./DEPLOY.md) before deploying.

Do not upload `.env` or personal files under `data/`. Public deployments must set:

```text
HOST=0.0.0.0
PUBLIC_AUTH_USER=your-login-name
PUBLIC_AUTH_PASSWORD=change-this-long-password
```

## Privacy

The browser never receives the API key. The app stores only local JSON data by default. Raw personal data files are ignored by Git and Docker packaging.
