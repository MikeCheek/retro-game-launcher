FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY backend ./backend
COPY frontend ./frontend

# Create roms directory
RUN mkdir -p roms

# Expose port
EXPOSE 3333

# Set environment
ENV NODE_ENV=production
ENV PORT=3333

# Start application
CMD ["node", "backend/app.js"]
