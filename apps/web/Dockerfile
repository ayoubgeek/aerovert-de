# apps/web/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Expose the port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]