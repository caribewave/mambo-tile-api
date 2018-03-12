const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const tilestrata = require('tilestrata');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./lib/tilestrataMBTiles');
const layerService = require('./lib/layerService');
const assetStorage = require('./lib/assetStorage');
const layerUtils = require('./lib/layerUtils');
const db = require('./lib/db');
const multer  = require('multer');

// Middleware init
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

const upload = multer({ storage: storage });
const mbtilesUpload = upload.single('mbtiles');


// Global vars
let app;
let server;

const onLayerAdd = async (req, res) => {
  const layer = req.body;
  if (!layer || !layer.meta.type || !layer.meta.name || !layer.meta.label) {
    return res.sendStatus(400);
  }
  switch (layer.meta.type) {
    case 'mbtiles':
      console.log('Will add MBTiles layer ' + layer.meta.name);
      break;
    case 'tiles':
      console.log('Will add Tiles layer ' + layer.meta.name);
      break;
    case 'proxy':
      if (!layer.meta.source) {
        return res.end(400);
      }
      console.log('Will add proxy layer ' + layer.meta.name);
  }

  await layerService.addLayer(layer);
  res.sendStatus(200);
  resetTileServer();
};

const onLayerDelete = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will remove layer ' + req.params.name);
  await layerService.deleteLayer(req.params.name);
  res.end();
  resetTileServer();
};

const onLayerCacheFlush = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will flush cache data for layer ' + req.params.name);
  await layerService.flushCache(req.params.name)
  res.end();
};

const onLayersGet = async (req, res) => {
  let layers = await layerService.getLayers();
  res.send(layers);
};

const resetTileServer = () => {
  setTimeout(() => {
    console.log('Will reinitialize tile-server with new layer config');
    server.close();
    initTileServer();
  }, 500);
};


/**
 * Post mbtiles file
 */
const onMBTilesPost = async (req, res, next) => {
  if (!req.file) {
    res.status(400).send();
    return;
  }
  console.log('Retrieving layer ' + req.params.name);
  let layer = await layerService.getLayer(req.params.name);
  switch (req.file.mimetype) {
    case 'application/vnd.mapbox-vector-tile':
    case 'application/octet-stream':
      console.log('Saving MBTiles layer');
      let result = await layerService.processMBTiles(layer, req.file);
      res.send(JSON.stringify(result));
      return;
      break;
    default:
      console.log('Received file of wrong type : ' + req.file.mimetype);
      res.status(415).send();
  }
};

async function initTileServer() {
  let strata = tilestrata();
  app = express();
  app.use(cors());

  const layers = await layerService.getLayers();

  console.log('Layers retrieved');
  for (let l in layers) {
    const layer = layers[l];
    switch (layer.meta.type) {
      case "tiles":
        layerUtils.createTilesLayer(app, strata, layer);
        break;
      case "mbtiles":
        layerUtils.createMBTilesLayer(app, strata, layer);
        break;
      case "proxy":
        if (layer.meta.vector) {
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
  app.post('/layers/upload/:name', mbtilesUpload, onMBTilesPost);
  app.delete('/layers/:name', onLayerDelete);
  app.delete('/layers/flush/:name', onLayerCacheFlush);
  server = app.listen(8081, () => console.log('App listening on port 8081!'));

}

const init = async () => {
  await db.connect();
  await layerService.init();
  await assetStorage.init();
  await initTileServer();
};

// Init server

(async function () {
  await init();
})();
