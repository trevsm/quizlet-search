FROM node:16
RUN apt-get update

# Install shell
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "index.js" ]