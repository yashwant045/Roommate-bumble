FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY server/ ./
COPY database/ ../database/

# Generate Prisma Client
RUN npx prisma generate --schema=../database/schema.prisma

EXPOSE 5000

CMD ["npm", "run", "dev"]
