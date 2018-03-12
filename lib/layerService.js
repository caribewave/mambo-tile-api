const Conf = require('../Conf/Conf');
const Layer = require('./schema/Layer');
const Style = require('./schema/Style');

const util = require('util');
const fs = require('fs-extra');
const axios = require('axios');

const baseUrl = Conf.protocol + "://" + Conf.host;

const getLayer = async (layerName) => {
  return await Layer.Model.findOne({ 'meta.name': layerName });
};

const getStyle = async (layerName) => {
  return await Style.Model.findOne({ 'layerName': layerName });
};

const processMBTiles = async (layer, file) => {
  await util.promisify(fs.rename)(file.path, Conf.dataPath + "/" + layer.meta.name + ".mbtiles");
  await layer.update({"meta.status": "ready"});
  return getLayer(layer.meta.name);
};

const init = async () => {
  await util.promisify(fs.ensureDir)(Conf.dataPath);
  let entryCount = await Layer.Model.count();
  if (entryCount === 0) {
    console.log('No entry previously saved. Will load defaults from profile');
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
  return layers;
};

/**
 * Process layer details and return it on resolution
 * @param layer the incoming layer data
 */
const processLayer = async (layer) => {
  layer = Layer.normalize(layer);
  
  if (layer.meta.vector) {
    // Specific handling for vector layers
    let response = await axios.get(layer.meta.source);
    const originalStyle = response.data;
    // Find glyphs and sprites
    layer.meta.glyphsSource = originalStyle.glyphs;
    layer.meta.spriteSource = originalStyle.sprite;
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
  return JSON.parse(JSON.stringify(layers));
};

const addLayer = async (layer) => {
  let l = await processLayer(layer);
  
  switch (l.meta.type) {
    case "tiles":
    case "mbtiles":
      l.meta.status = "created";
      break;
    case "proxy":
      l.meta.status = "ready";
  }
  
  let dbLayer = await Layer.Model.findOne({"meta.name": {$eq: layer.meta.name}});
  if (dbLayer) {
    await deleteLayerById(dbLayer._id);
  }
  let newLayer = await new Layer.Model(l).save();
  if (l.style) {
    await new Style.Model({layerName: newLayer.meta.name,layerId: newLayer._id, style: l.style}).save();
  }
  return newLayer;
};

const deleteLayerById = async (layerId) => {
  await Layer.Model.remove({_id: {$eq: layerId}});
  await Style.Model.remove({layerId: {$eq: layerId}});
};

const deleteLayer = async (layerName) => {
  await Layer.Model.remove({"meta.name": {$eq: layerName}});
  await Style.Model.remove({layerName: {$eq: layerName}});
};

const flushCache = async (layer) => {
  await util.promisify(fs.remove)(Conf.dataPath + "/" + layer);
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
  processMBTiles,
  getLayer,
  getStyle,
  getLayers: getLayers,
  addLayer: addLayer,
  deleteLayer: deleteLayer,
  flushCache: flushCache
};
