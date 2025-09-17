# Imagen base con Node 18 (trae npm incluido)
FROM node:18

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar solo package.json y package-lock.json primero (cache de dependencias)
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer puerto (Railway inyecta PORT, pero se declara por convención)
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]
