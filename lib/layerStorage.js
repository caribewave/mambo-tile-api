const fs = require('fs-extra');
const conf = require('../conf/conf');

const layersFile = conf.dataPath + '/layers.json';

let layers;

function init() {

  // Create data path if not exists
  fs.ensureDir(conf.dataPath);

  if (!fs.existsSync(layersFile)) {
    fs.writeFileSync(layersFile, JSON.stringify(conf.defaultLayers), 'utf-8');
  }

  layers = JSON.parse(fs.readFileSync(layersFile));
}

function getLayers(callback) {
  fs.readFile(layersFile, (err, data) => {
    if (err) {
      throw err;
    }
    layers = JSON.parse(data);
    callback(Object.assign({}, layers));
  });
}

function addLayer(layer) {
  layers[layer.name] = layer;
  fs.writeFile(layersFile, JSON.stringify(layers), (err) => {
    if (err) {
      throw err;
    }
  });
}

function deleteLayer(layer) {
  delete layers[layer];
  fs.writeFile(layersFile, JSON.stringify(layers), (err) => {
    if (err) {
      throw err;
    }
  });
}


function flushCache(layer) {
  fs.remove(conf.dataPath + "/" + layer, (err) => {
    if (err) {
      throw err;
    }
    console.log('Successfully flushed cache for layer ' + layer);
  });
}

init();

module.exports = {
  getLayers: getLayers,
  addLayer: addLayer,
  deleteLayer: deleteLayer,
  flushCache: flushCache
};