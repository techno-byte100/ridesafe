# Build Stage
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
COPY package*.json ./
RUN npm install
COPY . .
# Ensure prisma is generated
RUN npx prisma generate
RUN npm run build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
ENV NODE_ENV=production
# Uncomment if you need a specific port
# ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy prisma if using sqlite and it's in the root
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
