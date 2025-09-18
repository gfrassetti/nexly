FROM node:18

WORKDIR /app

# Copiar package.json y package-lock.json del backend
COPY api/package*.json ./

RUN npm install

# Copiar todo el backend
COPY api ./

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
