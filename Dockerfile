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

# Start production server
CMD ["npm", "start"]
