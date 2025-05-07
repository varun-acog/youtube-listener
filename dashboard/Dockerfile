# Use Node 18 as the base image
FROM node:18

# Install dependencies for Docker and PostgreSQL client
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install tsx globally
RUN npm install -g tsx

# Set working directory for the server
WORKDIR /app/server

# Copy server dependencies and install
COPY server/package*.json ./
RUN npm install

# Copy server code
COPY server/ .

# Set working directory for the client
WORKDIR /app/client

# Copy client dependencies and install
COPY client/package*.json ./
RUN npm install

# Copy client code
COPY client/ .

# Build the client (React app)
RUN npm run build || { echo "Vite build failed"; exit 1; }

# Copy the build output to the server's public directory
RUN mkdir -p /app/server/public && cp -r /app/client/dist/* /app/server/public/

# Set working directory back to server
WORKDIR /app/server

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["npm", "start"]