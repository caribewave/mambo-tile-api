const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const layerMetaSchema = new Schema({
  name: String,
  label: String,
  type: String, // proxy, mbtiles, tiles
  source: String,
  glyphsSource: String,
  spriteSource: String,
  status: String,
  retina: Boolean,
  vector: Boolean,
  default: Boolean
}, { _id : false });

const layerSchema = new Schema({
  meta: layerMetaSchema,
  source: String,
  sources: Schema.Types.Mixed
});

const Model = mongoose.model("Layer", layerSchema);

const normalize = (layer) => {
  return JSON.parse(JSON.stringify({
    meta: {
      name: layer.meta.name,
      label: layer.meta.label,
      type: layer.meta.type,
      source: layer.meta.source,
      status: layer.meta.status,
      retina: layer.meta.retina,
      vector: layer.meta.vector,
      default: layer.meta.default
    },
    source: layer.source,
    glyphsSource: layer.glyphsSource,
    spriteSource: layer.spriteSource,
    sources: layer.sources
  }));
};

module.exports = {
  Model,
  normalize
};