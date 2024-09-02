FROM bitnami/node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the application source code to the container
COPY . .

# Install application dependencies
RUN npm install
RUN npx prisma generate

# Environment variables should be set via Kubernetes ConfigMaps/Secrets
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
# Build app
RUN npm run build

# Expose the port that your NestJS application will run on
ENV PORT=${PORT:-3000}
EXPOSE ${PORT}

# Start the NestJS application
CMD [ "node", "dist/main.js" ]
