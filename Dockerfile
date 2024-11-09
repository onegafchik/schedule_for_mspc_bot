FROM node:alpine as build

COPY package.json package.json
RUN npm install
COPY . .

RUN npm install -g pm2

CMD ["sudo", "./src/main.js"]