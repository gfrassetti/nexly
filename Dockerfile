FROM node:18

WORKDIR /app

COPY api/package*.json ./
RUN npm install --include=dev

COPY api ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
