FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY index.html ./index.html
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
