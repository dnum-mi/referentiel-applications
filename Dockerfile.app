FROM bitnami/node:22

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the application source code to the container
COPY . .

# Install application dependencies
RUN npm install
RUN npx prisma generate

# Expose the port that your NestJS application will run on
ENV PORT=3500

# Build app
RUN npm run build

EXPOSE 3500

# Start the NestJS application
CMD [ "npm", "run", "start:prod" ]
