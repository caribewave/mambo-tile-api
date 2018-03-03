const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const tilestrata = require('tilestrata');
const dependency = require('tilestrata-dependency');
const disk = require('tilestrata-disk');
const sharp = require('tilestrata-sharp');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./lib/tilestrataMBTiles');
const layerStorage = require('./lib/layerStorage');
const assetStorage = require('./lib/assetStorage');
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

const createVectorProxyLayer = (strata, layer) => {
  console.log('Adding vector proxy layer ' + layer.name);

  for (let k in layer.sources) {
    let handler = strata.layer(layer.name + '-' + k);
    handler.route('*.pbf')
        .use(disk.cache({dir: conf.dataPath + '/' + layer.name + '-' + k}))
        .use(proxy({uri: layer.sources[k].tiles[0], decompress: 'always'}));
    app.get('/glyphs/' + layer.name + '/:fontstack/:range.pbf', (req, res) => {
      let params = {
        fontstack: req.params.fontstack,
        range: req.params.range,
        layer: layer.name,
        type: 'glyphs'
      };
      assetStorage.getGlyphs(params).then((data) => {
        res.send(data);
      }, (err) => {
        console.log(err);
        res.send(500);
      });
    });

    app.get('/sprites/' + layer.name + ':filename', (req, res) => {
      let params = {
        layer: layer.name,
        type: 'sprite',
        filename: req.params.filename
      };
      assetStorage.getSprite(params).then((data) => {
        console.log("sprite");
        res.send(data);
      }, (err) => {
        console.log(err);
        res.send(500);
      });
    });

    app.get('/maps/' + layer.name + '/style.json', (req, res) => {
      layerStorage.getLayers().then((layers) => {
        res.send(JSON.stringify(layers[layer.name].style));
      })
    });
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
      if (!layer.source) {
        return res.end(400);
      }
      console.log('Will add proxy layer ' + layer.name);
  }

  layerStorage.addLayer(Object.assign({}, {
    name: layer.name,
    type: layer.type,
    source: layer.source,
    retina: layer.retina,
    vector: layer.vector
  })).then(() => {
    res.end();
    resetTileServer();
  });
}

function onLayerDelete(req, res) {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will remove layer ' + req.params.name);
  layerStorage.deleteLayer(req.params.name).then(() => {
    res.end();
    resetTileServer();
  }).catch(() => {
    res.send(500);
  });

}

function onLayerCacheFlush(req, res) {
  if (!req.params.name) {
    return res.end(400);
  }
  console.log('Will flush cache data for layer ' + req.params.name);
  layerStorage.flushCache(req.params.name).then(() => {
    res.end();
  }).catch(() => {
    res.send(500);
  });

}

function onLayersGet(req, res) {
  layerStorage.getLayersPublic().then((layers) => {
    res.send(layers);
  }).catch(() => {
    res.send(500);
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
  app = express();
  app.use(cors());
  
  layerStorage.getLayers()
      .then((layers) => {
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
              if (layer.vector) {
                createVectorProxyLayer(strata, layer);
              } else {
                createProxyLayer(strata, layer);
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
        server = app.listen(3000, () => console.log('App listening on port 3000!'));
      })
      .catch(() => {
        res.send(500);
      });
}

layerStorage.init()
    .then(() => {
      initTileServer();
    });

