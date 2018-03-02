const MBTiles = require('@mapbox/mbtiles');

let source;

let options = {
  // Define options if necessary
};

function init(server, callback) {
  const uri = {query: Object.assign({}, options)};
  if (uri.query.pathname) {
    uri.pathname = uri.query.pathname;
    delete uri.query.pathname;
  }
  // Init MBTiles file
  new MBTiles(uri, (err, result) => {
    source = result;
    callback(err);
  });
}

function serve(server, tile, callback) {
  source.getTile(tile.z, tile.x, tile.y, (err, buffer, headers) => {
    if (err) {
      return callback(err);
    }
    callback(err, buffer, headers);
  });
}

function destroy(server, callback) {
  this.source.close();
  callback();
}

module.exports = (opts) => {
  
  options = Object.assign({}, options, opts);
  
  return {
    name: 'tilestrata-mbtiles',
    init: init,
    serve: serve,
    destroy: destroy
  };
};