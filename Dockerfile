# syntax=docker/dockerfile:1
FROM node:16
WORKDIR /app
COPY package*.json ./
COPY .env ./
run ls -al
RUN npm install 
COPY . .
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "index.js"]
