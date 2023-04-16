FROM node:18

RUN mkdir -p /maildaemon
COPY . /maildaemon

RUN cd /maildaemon && npm install

WORKDIR /maildaemon
CMD ["node", "/maildaemon/server.js"]
EXPOSE 25
