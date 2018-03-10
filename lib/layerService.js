const Conf = require('../Conf/Conf');
const Layer = require('./schema/Layer');

const fs = require('fs-extra');
const axios = require('axios');

const baseUrl = Conf.protocol + "://" + Conf.host;

let layers;

const initLayer = async (layer) => {
  let e = new Layer.Model({
    name: layer.name,
    label: layer.label,
    type: layer.type,
    status: "created",
    retina: layer.retina
  });
  return await e.save();
};

const getLayer = async (layerId) => {
  return await Layer.Model.findOne({ '_id': layerId });
};

const processMBTiles = async (layer, file) => {
  await fs.rename(file.path, Conf.dataPath + "/" + layer.meta.name + ".mbtiles");
  layer.status = "ready";
  return await new Layer.Model(layer).save();
};

const init = async () => {
  await fs.ensureDir(Conf.dataPath);
  let entryCount = await Layer.Model.count();
  if (entryCount === 0) {
    // No layers exist: Create them from Config
    const layers = await processDefaultLayers(Conf.defaultLayers);
    for (let i in layers) {
      await addLayer(layers[i]);  
    }
  }
};

const processDefaultLayers = async (defaultLayers) => {
  let layers = {};
  // Chain promises
  for (let l in defaultLayers) {
    let layer = {meta: defaultLayers[l]};
    layer.meta.name = l;
    layer = await processLayer(layer);
    layers[layer.meta.name] = layer;
  }
  console.log(layers);
  return layers;
};

/**
 * Process layer details and return it on resolution
 * @param layer the incoming layer data
 */
const processLayer = async (layer) => {
  layer = Layer.normalize(layer);
  
  if (layer.vector) {
    // Specific handling for vector layers
    let response = await axios.get(layer.meta.source);
    const originalStyle = response.data;
    // Find glyphs and sprites
    layer.glyphsSource = originalStyle.glyphs;
    layer.spriteSource = originalStyle.sprite;
    // Put sources
    layer.sources = originalStyle.sources;
    layer.source = computeSource(layer);
    layer.style = computeStyle(layer, originalStyle);
    return layer;
  } else {
    layer.source = computeSource(layer);
    return layer;
  }
};

const getLayers = async () => {
  const layers = await Layer.Model.find();
  
  console.log(layers);
  return JSON.parse(JSON.stringify(layers));
};

const addLayer = async (layer) => {
  let l = await processLayer(layer);
  return await new Layer.Model(l).save();
};

const deleteLayer = async (layer) => {
  delete layers[layer];
  Layer.Model.delete(layer._id);
};

const flushCache = async (layer) => {
  await Layer.Model.delete();
  console.log('Successfully flushed cache for layer ' + layer);
};

/**
 * Compute the effective layer source
 * @param layer
 */
const computeSource = (layer) => {
  if (layer.meta.vector) {
    return baseUrl + "/maps/" + layer.meta.name + "/style.json";
  } 
  if (layer.meta.retina) {
    return baseUrl + "/maps/" + layer.meta.name + "/{z}/{x}/{y}@2x.png";
  } 
  return baseUrl + "/maps/" + layer.meta.name + "/{z}/{x}/{y}.png";
};

/**
 * Change original style URLs to proxy
 * @param layer the layer structure
 * @param originalStyle the original style
 * @returns {{} & any}
 */
const computeStyle = (layer, originalStyle) => {
  let style = Object.assign({}, originalStyle);
  style.glyphs = baseUrl + '/glyphs/' + layer.name + '/{fontstack}/{range}.pbf';
  style.sprite = baseUrl + '/sprites/' + layer.name;
  style.sources = {};
  for (let k in originalStyle.sources) {
    style.sources[k] = Object.assign({}, originalStyle.sources[k]);
    style.sources[k].tiles = [];
    style.sources[k].tiles = [baseUrl + '/maps/' + layer.name + '-' + k + '/{z}/{x}/{y}.pbf']
  }
  return style;
};


module.exports = {
  init,
  initLayer,
  processMBTiles,
  getLayer,
  getLayers: getLayers,
  addLayer: addLayer,
  deleteLayer: deleteLayer,
  flushCache: flushCache
};
