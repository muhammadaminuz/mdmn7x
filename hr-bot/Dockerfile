FROM node:20-slim
WORKDIR /app

# Claude Code CLI — bot Claude bilan shu orqali, akkaunt tokeni bilan ishlaydi
RUN npm install -g @anthropic-ai/claude-code

COPY package*.json ./
RUN npm install
COPY tsconfig.json vacancies.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
