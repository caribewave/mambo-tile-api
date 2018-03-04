const fs = require('fs-extra');
const conf = require('../conf/conf');
const axios = require('axios');

const layersFile = conf.dataPath + '/layers.json';

let layers;

const init = () => {
  return new Promise((resolve, reject) => {
    // Create data path if not exists
    fs.ensureDir(conf.dataPath);

    if (!fs.existsSync(layersFile)) {
      // No layers exist: Create them from config
      processDefaultLayers(conf.defaultLayers).then((layers) => {
        fs.writeFile(layersFile, JSON.stringify(layers), 'utf-8', (err) => {
          console.log("Created default layers from config");
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
      return;
    }
    // Layers previously saved, load them
    fs.readFile(layersFile, (err, data) => {
      if (err) {
        return reject(err);
      }
      layers = JSON.parse(data);
      resolve();
    });
  });

};

const processDefaultLayers = (defaultLayers) => {
  let promise = Promise.resolve();
  let layers = {};
  // Chain promises
  for (let l in defaultLayers) {
    promise = promise.then(() => {
      return processLayer(Object.assign({name: l}, defaultLayers[l]));
    }).then((l) => {
      layers[l.name] = l;
    });
  }
  return promise.then(() => {
    return layers;
  });
};

const getLayers = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(layersFile, (err, data) => {
      if (err) {
        return reject(err);
      }
      layers = JSON.parse(data);
      resolve(Object.assign({}, layers));
    });
  });
};

const getLayersPublic = () => {
  let layersPublic = {};
  for (let l in layers) {
    layersPublic[l] = layers[l].public;
    layersPublic[l].original = clearLayerMeta(layers[l]);
  }
  return Promise.resolve(layersPublic);
};

const computeStyle = (layer, originalStyle) => {
  let style = Object.assign({}, originalStyle);
  style.glyphs = conf.protocol + "://" + conf.host + '/glyphs/' + layer.name + '/{fontstack}/{range}.pbf';
  style.sprite = conf.protocol + "://" + conf.host + '/sprites/' + layer.name;
  style.sources = {};
  for (let k in originalStyle.sources) {
    style.sources[k] = Object.assign({}, originalStyle.sources[k]);
    style.sources[k].tiles = [];
    style.sources[k].tiles = [conf.protocol + "://" + conf.host + '/maps/' + layer.name + '-' + k + '/{z}/{x}/{y}.pbf']
  }
  return style;
};

/**
 * Only keep the schema-metadata for a layer
 * @param layer the potentially dirty layer
 * @returns {{} & {name, type, source, retina: *|boolean, vector: *|boolean}}
 */
const clearLayerMeta = (layer) => {
  return Object.assign({}, {
    name: layer.name,
    label: layer.label,
    type: layer.type,
    source: layer.source,
    retina: layer.retina,
    vector: layer.vector,
    "default": layer.default
  });
};

/**
 * Compute the public view of the layer
 * @param layer
 */
const computePublic = (layer) => {
  let publicLayer = {
    name: layer.name,
    label: layer.label,
    type: layer.type,
    retina: layer.retina,
    vector: layer.vector,
    "default": layer.default 
  };
  
  if (publicLayer.vector) {
    publicLayer.source = conf.protocol + "://" + conf.host + "/maps/" + layer.name + "/style.json"
  } else if (publicLayer.retina) {
    publicLayer.source = conf.protocol + "://" + conf.host + "/maps/" + layer.name + "/{z}/{x}/{y}@2x.png"
  } else {
    publicLayer.source = conf.protocol + "://" + conf.host + "/maps/" + layer.name + "/{z}/{x}/{y}.png"
  }
  return publicLayer;
};

/**
 * Process layer details and return it on promise resolution
 * @param layer the incoming layer data
 * @returns {Promise<any>}
 */
const processLayer = (layer) => {
  return new Promise((resolve, reject) => {
    // Force layer schema
    layer = clearLayerMeta(layer);

    if (layer.vector) {
      // Specific handling for vector layers
      axios.get(layer.source)
          .then(function (response) {
            const originalStyle = response.data;
            layer.glyphsSource = originalStyle.glyphs;
            layer.spriteSource = originalStyle.sprite;
            layer.sources = originalStyle.sources;
            layer.public = computePublic(layer);
            layer.style = computeStyle(layer, originalStyle);
            resolve(layer);
          })
          .catch(function (err) {
            reject(err);
          });
      return;
    } else {
      layer.public = computePublic(layer);
      resolve(layer);
    }

  });
};

const addLayer = (layer) => {
  return new Promise((resolve, reject) => {
    processLayer(layer).then((l) => {
      layers[l.name] = l;
      fs.writeFile(layersFile, JSON.stringify(layers), (err) => {
        if (err) {
          return reject(err);
        }
        resolve(layers);
      });
    });
  });
};

const deleteLayer = (layer) => {
  return new Promise((resolve, reject) => {
    delete layers[layer];
    fs.writeFile(layersFile, JSON.stringify(layers), (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};


const flushCache = (layer) => {
  fs.remove(conf.dataPath + "/" + layer, (err) => {
    if (err) {
      throw err;
    }
    console.log('Successfully flushed cache for layer ' + layer);
  });
};


module.exports = {
  init: init,
  getLayers: getLayers,
  getLayersPublic: getLayersPublic,
  addLayer: addLayer,
  deleteLayer: deleteLayer,
  flushCache: flushCache
};