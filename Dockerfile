FROM node:9

RUN mkdir -p /opt/mambo/tiles

COPY . /opt/mambo
WORKDIR /opt/mambo

RUN npm install

EXPOSE 3000
CMD npm start
