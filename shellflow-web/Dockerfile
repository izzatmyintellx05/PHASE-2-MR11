FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY server ./server
COPY public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV PORT=3000
EXPOSE 3000
# Mount a volume on /app/data, or set DATABASE_URL, so data survives a restart
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server.js"]
