/**
 * This class is a rework of the disk-cache module of tilestrata.
 * Please check the original project here: https://github.com/naturalatlas/tilestrata-disk
 */

let fs = require('fs-extra');

function FileSystemCache(options) {
  this.options = options || {};
  if (this.options.refreshage && !this.options.maxage) {
    throw new Error('"refreshage" param must be used in conjunction with "maxage"');
  }

  if (typeof this.options.path === 'function') {
    this._file = this.options.path;
  } else if (this.options.path) {
    this._file = this._fileFromTemplate;
  } else {
    this._file = this._fileFromDirectory;
  }
};

FileSystemCache.prototype.name = 'disk';

FileSystemCache.prototype._fileFromTemplate = function(params) {
  return this.options.path
      .replace('{type}', params.type)
      .replace('{layer}', params.layer)
      .replace('{fontstack}', params.fontstack)
      .replace('{range}', params.range)
      .replace('{filename}', params.filename);
};

FileSystemCache.prototype._fileFromDirectory = function(params) {
  switch (params.type) {
    case 'glyphs':
      return this.options.dir + '/glyphs/' + params.fontstack + '/' + params.range + '.pbf';
    case 'sprite':
      return this.options.dir + '/sprites/sprites' + params.filename;
  }
};

FileSystemCache.prototype.init = function(callback) {
  if (this.options.dir) {
    return fs.ensureDir(this.options.dir, callback);
  }
  callback();
};

FileSystemCache.prototype.ageTolerance = function(key, params) {
  let age = this.options[key];
  return age*1000;
};

FileSystemCache.prototype.shouldServe = function(mtime, params) {
  // should the file be served from disk?
  let maxage = this.ageTolerance('maxage', params);
  if (isNaN(maxage)) return true;
  return Date.now() - mtime < maxage;
};

FileSystemCache.prototype.shouldRefresh = function(mtime, params) {
  // should the file be rebuilt in the background?
  let refreshage = this.ageTolerance('refreshage', params);
  if (isNaN(refreshage)) return false;
  return Date.now() - mtime > refreshage;
};

/**
 * Retrieves a file from the filesystem.
 *
 * @param {Request} req
 * @param {function} callback(err, buffer, headers)
 * @return {void}
 */
FileSystemCache.prototype.get = function(req, callback) {
  let _fd;
  let done = function(err, buffer, refresh) {
    if (_fd) {
      return fs.close(_fd, function() { callback(err, buffer||null, refresh); });
    }
    return callback(err, buffer||null, refresh);
  };

  // don't even attempt the fs lookup if maxage=0
  let maxage = this.ageTolerance('maxage', req);
  if (maxage === 0) return done();

  let self = this;
  let file = this._file(req);
  fs.open(file, 'r', function(err, fd) {
    if (err) {
      if (err.code === 'ENOENT') return callback();
      return callback(err);
    }
    _fd = fd;
    fs.fstat(fd, function(err, stats) {
      if (err) return done(err);

      let mtime = stats.mtime.getTime();
      let shouldServe = self.shouldServe(mtime, req);
      if (!shouldServe) return done();
      let shouldRefresh = self.shouldRefresh(mtime, req);

      let buffer = new Buffer(stats.size);
      if (!stats.size) {
        return done(null, buffer, shouldRefresh);
      }

      fs.read(fd, buffer, 0, stats.size, 0, function(err) {
        if (err) return done(err);
        done(null, buffer, shouldRefresh);
      });
    });
  });
};

/**
 * Stores a file on the filesystem.
 *
 * @param {Params} params
 * @param {Buffer} buffer
 * @param {Function} callback
 */
FileSystemCache.prototype.set = function(params, buffer, callback) {
  let maxage = this.ageTolerance('maxage', params);
  if (maxage === 0) return callback();
  fs.outputFile(this._file(params), buffer, callback);
};

module.exports = function(options) {
  return new FileSystemCache(options);
};
