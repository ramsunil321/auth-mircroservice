FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (including devDependencies so prisma CLI is available for generation/migration)
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "src/app.js"]
