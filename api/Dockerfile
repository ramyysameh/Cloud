# CloudPaste API container.
# The dependency stage includes build tools so native bcrypt installs reliably on Alpine.
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Runtime stage: no compiler toolchain, only the app and production dependencies.
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libstdc++
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
