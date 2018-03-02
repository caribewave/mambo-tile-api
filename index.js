const express = require('express');
const bodyParser = require('body-parser')
const tilestrata = require('tilestrata');
const dependency = require('tilestrata-dependency');
const disk = require('tilestrata-disk');
const sharp = require('tilestrata-sharp');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./lib/tilestrataMBTiles');
const layerStorage = require('./lib/layerStorage');

const conf = require('./conf/conf');

let app;
let server;

const createTilesLayer = (strata, layer) => {
  console.log('Adding tiles layer ' + layer.name);
  let handler = strata.layer(layer.name);
  if (layer.retina) {
    handler
        .route('*@2x.png')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
        .route('*.png')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
        .use(dependency(layer.name, '*@2x.png'))
        .use(sharp((image, sharp) => {
          return image.resize(256);
        }));
  }
  else {
    handler.route('*.png').use(disk.cache({dir: conf.dataPath + '/' + layer.name}));
  }
};

const createProxyLayer = (strata, layer) => {
  console.log('Adding proxy layer ' + layer.name);
  let handler = strata.layer(layer.name);
  if (layer.retina) {
    handler.route('*@2x.png')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
        .use(proxy({uri: layer.source}))
        .route('*.png')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
        .use(dependency(layer.name, '*@2x.png'))
        .use(sharp((image, sharp) => {
          return image.resize(256);
        }));
  }
  else {
    handler.route('*.png')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
        .use(proxy({uri: layer.source}));
  }
};

const createMBTilesLayer = (strata, layer) => {
  console.log('Adding MBTiles layer ' + layer.name);
  strata.layer(layer.name)
      .route('*.png')
      .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
      .use(mbtiles({
        pathname: conf.dataPath + '/' + layer.name + '.mbtiles'
      }));
};


function onLayerAdd(req, res) {
  const layer = req.body;
  if (!layer || !layer.type || !layer.name) {
    return res.end(400);
  }
  switch (layer.type) {
    case 'mbtiles':
      console.log('Will add MBTiles layer ' + layer.name);
      break;
    case 'tiles':
      console.log('Will add Tiles layer ' + layer.name);
      break;
    case 'proxy':
      if  (!layer.source) {
        return res.end(400);
      }
      console.log('Will add proxy layer ' + layer.name);
  }
  layerStorage.addLayer(layer);
  res.end();
  resetTileServer();
}

function onLayerDelete(req, res) {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will remove layer ' + req.params.name);
  layerStorage.deleteLayer(req.params.name);
  res.end();
  resetTileServer();
}

function onLayerCacheFlush(req, res) {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will flush cache data for layer ' + req.params.name);
  layerStorage.flushCache(req.params.name);
  res.end();
}

function onLayersGet(req, res) {
  layerStorage.getLayers((layers) => {
    res.send(layers);
  });
}

function resetTileServer() {
  setTimeout(() => {
    console.log('Will reinitialize tile-server with new layer config');
    server.close();
    initTileServer();
  }, 500);
}

function initTileServer() {
  let strata = tilestrata();
  layerStorage.getLayers((layers) => {
    console.log('Layers retrieved');
    for (let l in layers) {
      const layer = Object.assign({"name": l}, layers[l]);
      switch (layer.type) {
        case "tiles":
          createTilesLayer(strata, layer);
          break;
        case "mbtiles":
          createMBTilesLayer(strata, layer);
          break;
        case "proxy":
          createProxyLayer(strata, layer);
          break;
      }
    }
    app = express();
    app.use(tilestrata.middleware({
      server: strata,
      prefix: '/maps'
    }));
    app.get('/layers', onLayersGet);
    app.post('/layers', bodyParser.json(), onLayerAdd);
    app.delete('/layers/:name', onLayerDelete);
    app.delete('/layers/flush/:name', onLayerCacheFlush);
    server = app.listen(3000, () => console.log('App listening on port 3000!'));
  });
  
}

initTileServer();