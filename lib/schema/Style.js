const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sourceSchema = new Schema({
  type: String,
  tiles: [String],
  maxzoom: Number
});

const sourcesSchema = new Schema({
  any: sourceSchema
});

const styleJsonSchema = new Schema({
  "version": Number,
  "glyphs": String,
  "sprite": String,
  "sources": sourcesSchema,
  "layers": [Schema.Types.Mixed]
});

const styleSchema = new Schema({
  "layerId": String,
  "style": styleJsonSchema
});

export const Model = mongoose.model("Style", styleSchema);