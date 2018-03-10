const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const tilestrata = require('tilestrata');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./lib/tilestrataMBTiles');
const layerStorage = require('./lib/layerService');
const assetStorage = require('./lib/assetStorage');
const layerUtils = require('./lib/layerUtils');
const db = require('./lib/db');

let app;
let server;

const onLayerAdd = async (req, res) => {
  const layer = req.body;
  if (!layer || !layer.type || !layer.name || !layer.label) {
    return res.sendStatus(400);
  }
  switch (layer.type) {
    case 'mbtiles':
      console.log('Will add MBTiles layer ' + layer.name);
      break;
    case 'tiles':
      console.log('Will add Tiles layer ' + layer.name);
      break;
    case 'proxy':
      if (!layer.source) {
        return res.end(400);
      }
      console.log('Will add proxy layer ' + layer.name);
  }

  await layerStorage.addLayer(Object.assign({}, {
    name: layer.name,
    label: layer.label,
    type: layer.type,
    source: layer.source,
    retina: layer.retina,
    vector: layer.vector
  }));
  res.end();
  resetTileServer();
};

const onLayerDelete = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will remove layer ' + req.params.name);
  await layerStorage.deleteLayer(req.params.name);
  res.end();
  resetTileServer();
};

const onLayerCacheFlush = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will flush cache data for layer ' + req.params.name);
  await layerStorage.flushCache(req.params.name)
  res.end();
};

const onLayersGet = async (req, res) => {
  let layers = await layerStorage.getLayers();
  res.send(layers);
};

function resetTileServer() {
  setTimeout(() => {
    console.log('Will reinitialize tile-server with new layer config');
    server.close();
    initTileServer();
  }, 500);
}

function initTileServer() {
  let strata = tilestrata();
  app = express();
  app.use(cors());

  layerStorage.getLayers()
      .then((layers) => {
        console.log('Layers retrieved');
        for (let l in layers) {
          const layer = Object.assign({"name": l}, layers[l]);
          switch (layer.type) {
            case "tiles":
              layerUtils.createTilesLayer(app, strata, layer);
              break;
            case "mbtiles":
              layerUtils.createMBTilesLayer(app, strata, layer);
              break;
            case "proxy":
              if (layer.vector) {
                layerUtils.createVectorProxyLayer(app, strata, layer);
              } else {
                layerUtils.createProxyLayer(app, strata, layer);
              }
              break;
          }
        }

        app.use(tilestrata.middleware({
          server: strata,
          prefix: '/maps'
        }));

        app.get('/layers', onLayersGet);
        app.post('/layers', bodyParser.json(), onLayerAdd);
        app.delete('/layers/:name', onLayerDelete);
        app.delete('/layers/flush/:name', onLayerCacheFlush);
        server = app.listen(8081, () => console.log('App listening on port 8081!'));
      })
      .catch((err) => {
        console.error(err);
        throw err;
      });
}

const init = async () => {
  await db.connect();
  await layerStorage.init();
  await assetStorage.init();
  initTileServer();
};

// Init server

(async function() {
  await init();
})();
