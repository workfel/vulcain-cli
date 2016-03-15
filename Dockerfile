FROM alpine

RUN apk update && apk add git nodejs
COPY src/package.json app/package.json

COPY node_modules /app/node_modules

COPY lib /app
WORKDIR /var
VOLUME /var

ENTRYPOINT /app/main.js 
