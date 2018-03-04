const fs = require('fs-extra');
const conf = require('../conf/conf');
const axios = require('axios');
const assetCache = require('./assetCache')({dir: conf.assetsDataPath});
const layerStorage = require('./layerStorage');

function init() {
  return new Promise((resolve, reject) => {
    // Initialize asset cache
    assetCache.init(() => {
      console.log('Asset Cache initialized');
      resolve();
    });
  });
  
}

function getGlyphs(params) {
  return new Promise((resolve, reject) => {
    assetCache.get(params, (err, buffer, refresh) => {
      if (!buffer) {
        layerStorage.getLayers()
            .then((layers) => {
              let layer = layers[params.layer];
              axios.get(layer.glyphsSource
                  .replace('{layer}', params.layer)
                  .replace('{fontstack}', params.fontstack)
                  .replace('{range}', params.range), {
                responseType: 'arraybuffer'
              })
                  .then((response) => {
                    resolve(response.data);
                    assetCache.set(params, response.data, (err) => {
                      if (err) console.log('Oops');
                    });
                  })
                  .catch(function (error) {
                    reject(error);
                  });
            });

      } else {
        resolve(buffer);
        if (refresh) {
          // TODO will deal with this later.
          // For now, refresh serves the old tile ad vitam.
        }
      }
    });
  });
}


function getSprite(params) {
  return new Promise((resolve, reject) => {
    assetCache.get(params, (err, buffer, refresh) => {
          if (!buffer) {
            layerStorage.getLayers()
                .then((layers) => {
                      let layer = layers[params.layer];
                      axios.get(layer.spriteSource + params.filename, {
                        responseType: 'arraybuffer'
                      })
                          .then((response) => {
                            resolve(response.data);
                            assetCache.set(params, response.data, (err) => {

                            });
                          })
                          .catch(function (error) {
                            reject(error);
                          });
                    }
                );

          }
          else {
            resolve(buffer);
            if (refresh) {
              // TODO will deal with this later.
              // For now, refresh serves the old tile ad vitam.
            }
          }
        }
    )
    ;
  })
      ;
}

module.exports = {
  init: init,
  getGlyphs: getGlyphs,
  getSprite: getSprite
};