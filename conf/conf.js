module.exports = {
  "db": {
    "host": "localhost",
    // ENABLED IF SPECIFIC port
    //"port": 27017,
    // ENABLE IF AUTHENTICATION ENABLED
    //"username": null,
    //"password": null,
    "database": "tile"
  },
  "defaultLayers": {
    "jawg4mambo": {
      "default": true,
      "display": true,
      "label": "Jawg 4 Mambo",
      "type": "proxy",
      "retina": true,
      "source": "https://tile.jawg.io/dcf4c7bc-8370-4671-9e68-726b8d6661c0/{z}/{x}/{y}@2x.png?access-token=IP0rUgIapE6RZqf8827e2LbmEVFqUaVzKHQSHBKzkAGDh02VWvFK7x6H5nsAm47c"
    },
    "osm": {
      "label": "OpenStreetMap",
      "type": "proxy",
      "retina": false,
      "source": "http://tile.openstreetmap.org/{z}/{x}/{y}.png"
    },
    "hot": {
      "label": "OpenStreetMap HOT",
      "type": "proxy",
      "retina": false,
      "source": "http://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png"
    }
  },
  "dataPath": "tiles",
  "assetsDataPath": "assets",
  "protocol": "http",
  "host": "localhost:8081"
};