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
const Logger = require('./lib/log/Logger')();
const Spinner = Logger.spinner();

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
      Spinner.start('Adding MBTiles layer ' + layer.meta.name);
      break;
    case 'tiles':
      Spinner.start('Adding Tiles layer ' + layer.meta.name);
      break;
    case 'proxy':
      if (!layer.meta.source) {
        return res.end(400);
      }
      Spinner.start('Adding proxy layer ' + layer.meta.name);
  }
  let result = await layerService.addLayer(layer);
  res.send(result);
  Spinner.succeed();
  resetTileServer();
};

const onLayerDelete = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  Logger.info('Removing layer ' + req.params.name);
  await layerService.deleteLayer(req.params.name);
  res.send({"name": req.params.name, "deleted": true});
  resetTileServer();
};

const onLayerCacheFlush = async (req, res) => {
  if (!req.params.name) {
    return res.end(400);
  }
  Logger.info('Flushing cache data for layer ' + req.params.name);
  await layerService.flushCache(req.params.name)
  res.end();
};

const onLayersGet = async (req, res) => {
  let layers = await layerService.getLayers();
  res.send(layers);
};

const resetTileServer = () => {
  setTimeout(() => {
    Spinner.start('Reinitializing tile-server with new layer config');
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
  Logger.info('Retrieving layer ' + req.params.name);
  let layer = await layerService.getLayer(req.params.name);
  switch (req.file.mimetype) {
    case 'application/vnd.mapbox-vector-tile':
    case 'application/octet-stream':
      Logger.info('Saving MBTiles layer');
      let result = await layerService.processMBTiles(layer, req.file);
      res.send(result);
      return;
      break;
    default:
      Logger.warn('Received file of wrong type : ' + req.file.mimetype);
      res.status(415).send();
  }
};


/**
 * Show / hide layer
 */
const onLayerShow = async (req, res, next) => {
  let result = await layerService.showLayer(req.params.name, req.params.show);
  res.send(result);
};

async function initTileServer() {
  let strata = tilestrata();
  app = express();
  app.use(cors());

  const layers = await layerService.getLayers();

  Spinner.start('Layers retrieved');
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
  app.post('/layers/:name/upload', mbtilesUpload, onMBTilesPost);
  app.post('/layers/:name/show/:show', onLayerShow);
  app.delete('/layers/:name', onLayerDelete);
  app.delete('/layers/:name/flush', onLayerCacheFlush);
  server = app.listen(8081, () => Logger.info('App listening on port 8081!'));
  Spinner.succeed();
}

const init = async () => {
  Logger.info('Initializing app');
  Spinner.start('Connecting to Database');
  await db.connect();
  Spinner.succeed();
  Spinner.start('Initializing Layer Service');
  await layerService.init();
  Spinner.succeed();
  Spinner.start('Initializing Storage');
  await assetStorage.init();
  Spinner.succeed();
  Spinner.start('Initializing Tile Service');
  await initTileServer();
};

// Init server

(async function () {
  await init();
})();
