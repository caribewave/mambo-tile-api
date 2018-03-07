FROM node:9

RUN mkdir -p /opt/mambo/tiles
RUN mkdir -p /opt/mambo/conf
WORKDIR /opt/mambo

COPY ./index.js /opt/mambo/
COPY ./package.json /opt/mambo/
COPY ./lib /opt/mambo/lib

RUN npm install

EXPOSE 8081
CMD npm start
