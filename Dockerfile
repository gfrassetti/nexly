FROM node:18

WORKDIR /app

# Copiar package.json y package-lock.json
COPY api/package*.json ./

# Instalar TODAS las dependencias (incluyendo dev)
RUN npm install --include=dev

# Copiar el resto del código
COPY api/ ./

# Dar permisos al compilador TypeScript
RUN chmod +x ./node_modules/.bin/tsc

# Compilar TypeScript
RUN npx tsc

EXPOSE 3000
CMD ["npm", "start"]
