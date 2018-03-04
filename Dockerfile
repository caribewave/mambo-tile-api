FROM node:9

RUN mkdir -p /opt/mambo/tiles

COPY ./index.js /opt/mambo/
COPY ./package.json /opt/mambo/
COPY ./lib /opt/mambo/lib

WORKDIR /opt/mambo

RUN npm install

EXPOSE 8081
CMD npm start
