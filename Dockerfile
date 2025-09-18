FROM node:18

WORKDIR /app

# Copiar package.json y package-lock.json de la API
COPY api/package*.json ./

# Instalar TODAS las dependencias (incluyendo dev)
RUN npm install --include=dev

# Copiar el resto del código
COPY api ./

# Forzar permisos de ejecución sobre binarios locales
RUN chmod +x ./node_modules/.bin/tsc

# Compilar TypeScript
RUN npx tsc

EXPOSE 3000
CMD ["npm", "start"]
