FROM node:18

WORKDIR /app

# 1) Dependencias (aprovecha cache)
COPY api/package*.json ./
RUN npm install --include=dev

# 2) Código de la API (manteniendo la carpeta src/) + tsconfig
COPY api/src ./src
COPY api/tsconfig.json ./

# 3) Compilar TS
RUN chmod +x ./node_modules/.bin/tsc
RUN npx tsc

EXPOSE 3000
CMD ["npm", "start"]
