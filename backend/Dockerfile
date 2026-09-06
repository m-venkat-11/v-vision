FROM node:20-bullseye-slim

# Install GCC, GDB, and standard C development libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    gdb \
    libc6-dev \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

EXPOSE 3001
ENV PORT=3001
CMD ["node", "src/index.js"]
