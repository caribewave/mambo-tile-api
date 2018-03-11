const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sourceSchema = new Schema({
  type: String,
  tiles: [String],
  maxzoom: Number
}, { _id : false });

const sourcesSchema = new Schema({
  any: sourceSchema
}, { _id : false });

const styleJsonSchema = new Schema({
  "version": Number,
  "glyphs": String,
  "sprite": String,
  "sources": sourcesSchema,
  "layers": [Schema.Types.Mixed]
}, { _id : false });

const styleSchema = new Schema({
  "layerId": String,
  "layerName": String,
  "style": styleJsonSchema
});

const Model = mongoose.model("Style", styleSchema);

module.exports = {
  Model
};