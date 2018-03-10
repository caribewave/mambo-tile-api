const fs = require('fs-extra');
const conf = require('../conf/conf');
const axios = require('axios');
const assetCache = require('./assetCache')({dir: conf.assetsDataPath});
const layerStorage = require('./layerService');

const init = async () => {
  // Initialize asset cache
  await assetCache.init();
  console.log('Asset Cache initialized');
};

const getGlyphs = async (params) => {
  const p = new Promise((resolve, reject) => {
    assetCache.get(params, async (err, buffer, refresh) => {
      if (!buffer) {
        const layers = await layerStorage.getLayers();
        let layer = layers[params.layer];
        let response = await axios.get(layer.glyphsSource
            .replace('{layer}', params.layer)
            .replace('{fontstack}', params.fontstack)
            .replace('{range}', params.range), {
          responseType: 'arraybuffer'
        });
        resolve(response.data);
        assetCache.set(params, response.data, (err) => {
          if (err) console.log('Oops');
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
  await p;
};


const getSprite = async (params) => {
  const p = new Promise((resolve, reject) => {
    assetCache.get(params, async (err, buffer, refresh) => {
          if (!buffer) {
            let layers = await layerStorage.getLayers();
            let layer = layers[params.layer];
            let response = await axios.get(layer.spriteSource + params.filename, {
              responseType: 'arraybuffer'
            });
            resolve(response.data);
            assetCache.set(params, response.data, (err) => {
            });
          }
          else {
            resolve(buffer);
            if (refresh) {
              // TODO will deal with this later.
              // For now, refresh serves the old tile ad vitam.
            }
          }
        });
  });
  await p;
};

module.exports = {
  init: init,
  getGlyphs: getGlyphs,
  getSprite: getSprite
};