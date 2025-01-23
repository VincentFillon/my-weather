# Use the official Node.js image from the Docker Hub
FROM node:22

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the local code to the container image.
COPY . .

# If .env does not exist, copy .env.example to .env
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Build the app
RUN npm run build

# Expose the port the app runs on
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Run the web service on container startup.
CMD ["node", "dist/main"]