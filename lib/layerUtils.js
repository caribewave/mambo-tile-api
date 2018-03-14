const dependency = require('tilestrata-dependency');
const disk = require('tilestrata-disk');
const sharp = require('tilestrata-sharp');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./tilestrataMBTiles');
const layerService = require('./layerService');
const assetStorage = require('./assetStorage');
const Conf = require('../conf/conf');


const createTilesLayer = (app, strata, layer) => {
  console.log('Adding tiles layer ' + layer.meta.name);
  let handler = strata.layer(layer.meta.name);
  if (layer.meta.retina) {
    handler
        .route('*@2x.png')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
        .route('*.png')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
        .use(dependency(layer.meta.name, '*@2x.png'))
        .use(sharp((image, sharp) => {
          return image.resize(256);
        }));
  }
  else {
    handler.route('*.png').use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}));
  }
};

const createProxyLayer = (app, strata, layer) => {
  console.log('Adding proxy layer ' + layer.meta.name);
  let handler = strata.layer(layer.meta.name);
  if (layer.meta.retina) {
    handler.route('*@2x.png')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
        .use(proxy({uri: layer.meta.source}))
        .route('*.png')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
        .use(dependency(layer.meta.name, '*@2x.png'))
        .use(sharp((image, sharp) => {
          return image.resize(256);
        }));
  }
  else {
    handler.route('*.png')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
        .use(proxy({uri: layer.meta.source}));
  }
};

const createVectorProxyLayer = (app, strata, layer) => {
  console.log('Adding vector proxy layer ' + layer.meta.name);
  for (let k in layer.sources) {
    let handler = strata.layer(layer.meta.name + '-' + k);
    handler.route('*.pbf')
        .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name + '-' + k}))
        .use(proxy({uri: layer.sources[k].tiles[0], decompress: 'always'}));
    app.get('/glyphs/' + layer.meta.name + '/:fontstack/:range.pbf', async (req, res) => {
      let params = {
        fontstack: req.params.fontstack,
        range: req.params.range,
        layer: layer.meta.name,
        type: 'glyphs'
      };
      const data = await assetStorage.getGlyphs(params);
      res.send(data);
    });

    app.get('/sprites/' + layer.meta.name + ':filename', async (req, res) => {
      let params = {
        layer: layer.meta.name,
        type: 'sprite',
        filename: req.params.filename
      };
      const data = await assetStorage.getSprite(params);
      res.send(data);
    });

    app.get('/maps/' + layer.meta.name + '/style.json', async (req, res) => {
      const style = await layerService.getStyle(layer.meta.name);
      res.send(JSON.stringify(style.style));
    });
  }
};

const createMBTilesLayer = (app, strata, layer) => {
  console.log('Adding MBTiles layer ' + layer.meta.name);
  strata.layer(layer.meta.name)
      .route('*.png')
      .use({
        name: 'reshook',
        init: function (server, callback) {
          callback();
        },
        reshook: function (server, tile, req, res, result, callback) {
          if (result.status === 500) {
            result.status = 404;
          }
          callback();
        },
        destroy: function (server, callback) {
          callback();
        }
      })
      .use(disk.cache({dir: Conf.dataPath + '/' + layer.meta.name}))
      .use(mbtiles({
        pathname: Conf.dataPath + '/' + layer.meta.name + '.mbtiles'
      }));
};


module.exports = {
  createVectorProxyLayer,
  createProxyLayer,
  createMBTilesLayer,
  createTilesLayer
};