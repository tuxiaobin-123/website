FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY assets ./assets
COPY data/profile.example.json ./data/profile.example.json
COPY lib ./lib
COPY scripts ./scripts
COPY index.html server.js ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8765

EXPOSE 8765

CMD ["node", "server.js"]
