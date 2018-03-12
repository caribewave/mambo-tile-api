const fs = require('fs-extra');
const conf = require('../conf/conf');
const axios = require('axios');
const assetCache = require('./assetCache')({dir: conf.assetsDataPath});
const layerService = require('./layerService');

const init = async () => {
  // Initialize asset cache
  await assetCache.init();
  console.log('Asset Cache initialized');
};

const getGlyphs = async (params) => {
  const p = new Promise((resolve, reject) => {
    assetCache.get(params, async (err, buffer, refresh) => {
      if (!buffer) {
        const layer = await layerService.getLayer(params.layer);
        let response = await axios.get(layer.meta.glyphsSource
            .replace('{layer}', params.layer)
            .replace('{fontstack}', params.fontstack)
            .replace('{range}', params.range), {
          responseType: 'arraybuffer'
        });
        assetCache.set(params, response.data, (err) => {
          if (err) console.log('Oops');
          resolve(response.data);
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
  return await p;
};


const getSprite = async (params) => {
  const p = new Promise((resolve, reject) => {
    assetCache.get(params, async (err, buffer, refresh) => {
          if (!buffer) {
            const layer = await layerService.getLayer(params.layer);
            let response = await axios.get(layer.meta.spriteSource + params.filename, {
              responseType: 'arraybuffer'
            });
            assetCache.set(params, response.data, (err) => {
              resolve(response.data);
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
  return await p;
};

module.exports = {
  init: init,
  getGlyphs: getGlyphs,
  getSprite: getSprite
};