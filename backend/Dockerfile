FROM node:20-bookworm-slim

# Install GCC, GDB, and standard C development libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gdb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

# Render exposes PORT dynamically (defaults to 10000 on Render, fallback in index.js)
ENV PORT=10000
EXPOSE 10000

CMD ["node", "src/index.js"]
