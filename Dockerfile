FROM node:latest

# Create app directory
WORKDIR /app

# Install app dependencies
COPY ./referentiel-applications/package.json ./
RUN npm install

# Copy app source code
COPY ./referentiel-applications ./

COPY ./referentiel-applications/prisma/schema.prisma ./
RUN npx prisma generate


# Expose port and start the app
EXPOSE 3000
CMD ["npm", "run", "dev"]
