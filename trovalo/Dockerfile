FROM node:20-alpine

# HAOS specific persistent storage layer mapped via Supervisor
ENV DB_PATH=/data/trovalo_db
WORKDIR /app

# Install dependency configurations
COPY package*.json ./
RUN npm install

# Copy source repository structure and run static build compilation
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "server.js"]