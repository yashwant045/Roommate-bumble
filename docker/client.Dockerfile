FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY client/ ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
