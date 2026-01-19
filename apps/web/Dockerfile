# ==============================================================================
# WEB DOCKERFILE (Development)
# Node.js 20 + PNPM
# ==============================================================================

# 1. Base Image
FROM node:20-slim

# 2. Enable pnpm
RUN corepack enable

# 3. Workspace Setup
WORKDIR /app

# 4. Install Dependencies
COPY package.json ./
RUN pnpm install

# 5. Copy Source Code
COPY . .

# 6. Command
CMD ["pnpm", "dev"]