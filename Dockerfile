FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (will be installed in container's architecture)
RUN npm ci --only=production=false && npm cache clean --force

# Expose port
EXPOSE 3000

# Start application (development mode with hot reload)
CMD ["npm", "run", "start:dev"]
