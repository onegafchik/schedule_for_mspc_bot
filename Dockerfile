FROM node:lts-alpine as build

COPY package.json package.json
RUN npm install
COPY . .

RUN npm install -g pm2@5.4.2

CMD ["pm2-runtime", "./src/main.js"]