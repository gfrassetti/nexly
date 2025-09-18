FROM node:18

WORKDIR /app

# Copiar package.json y package-lock.json
COPY api/package*.json ./

# Copiar tsconfig.json también
COPY api/tsconfig.json ./

# Instalar dependencias
RUN npm install --include=dev

# Copiar el resto del código
COPY api/ ./

# Compilar TypeScript
RUN npx tsc

EXPOSE 3000
CMD ["npm", "start"]
