const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const styleJsonSchema = new Schema({
  "version": Number,
  "glyphs": String,
  "sprite": String,
  "sources": Schema.Types.Mixed,
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