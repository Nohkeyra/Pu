FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build client and bundle server
RUN npm run build

# Expose port 3000
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Health check rule for Docker runtime & Cloud Run instance monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start production server
CMD ["npm", "start"]
