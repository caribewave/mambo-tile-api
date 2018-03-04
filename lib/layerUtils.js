const dependency = require('tilestrata-dependency');
const disk = require('tilestrata-disk');
const sharp = require('tilestrata-sharp');
const proxy = require('tilestrata-proxy');
const mbtiles = require('./tilestrataMBTiles');
const layerStorage = require('./layerStorage');
const assetStorage = require('./assetStorage');
const conf = require('../conf/conf');


const createTilesLayer = (app, strata, layer) => {
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

const createProxyLayer = (app, strata, layer) => {
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

const createVectorProxyLayer = (app, strata, layer) => {
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

const createMBTilesLayer = (app, strata, layer) => {
  console.log('Adding MBTiles layer ' + layer.name);
  strata.layer(layer.name)
      .route('*.png')
      .use(disk.cache({dir: conf.dataPath + '/' + layer.name}))
      .use(mbtiles({
        pathname: conf.dataPath + '/' + layer.name + '.mbtiles'
      }));
};


module.exports = {
  createVectorProxyLayer,
  createProxyLayer,
  createMBTilesLayer,
  createTilesLayer
};