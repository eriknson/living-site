FROM node:20-slim

# Install git and curl
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install Cursor CLI
RUN curl https://cursor.com/install -fsS | bash

# Add cursor-agent to PATH
ENV PATH="/root/.local/bin:$PATH"

# Verify cursor-agent is installed
RUN cursor-agent --version || echo "cursor-agent binary exists"

WORKDIR /app

# Create minimal isolated workspace structure
RUN mkdir -p workspace/context workspace/generated

# Copy context files (copied to infra/fly-agent/fly-context/ before build)
# reference.html is the canonical site design (updated daily from live site)
# today.json has minimal dynamic context (mood, weather, etc.)
COPY fly-context/reference.html ./workspace/context/
COPY fly-context/today.json ./workspace/context/

# Copy server files (build context is infra/fly-agent/)
WORKDIR /app/server
COPY package.json ./
COPY server.ts ./

# Install server dependencies
RUN npm install

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]

