FROM node:16
RUN apt-get update

# Install shell
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# install golang
RUN curl -OL https://golang.org/dl/go1.16.7.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.16.7.linux-amd64.tar.gz
ENV PATH $PATH:/usr/local/go/bin

# go install pup
RUN go install github.com/ericchiang/pup@latest
ENV PATH $PATH:/root/go/bin

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "index.js" ]