# Mambo Tile API

Develop Branch: 
![Build status on develop](https://travis-ci.org/caribewave/mambo-tile-api.svg?branch=develop)  
Master Branch:
![Build status on master](https://travis-ci.org/caribewave/mambo-tile-api.svg?branch=master)


This project will behave as the dedicated TMS tile-server for the Mambo Project (Hackers Against Natural Disasters).

It uses a lightweight tile-server (tilestrata) and supports both file tiles (cache), mbtiles, and proxy layers.

To configure the tile-server, simply change the content of the conf/conf.js file.

To run the server, simply run ```npm start```.

The app is listening on port 3000 by default.



## API

```GET /maps/{layer}/style.json```  
Retrieve the style.json for a vector style

```GET /maps/{layer}/{z}/{x}/{y}.png```  
Retrieve a PNG tile from layer

```GET /maps/{layer}/{z}/{x}/{y}@2x.png```  
Retrieve a retina PNG tile from layer

```GET /layers```  
Retrieve the current list of layers and their metadata

```POST /layers```  
Add a new layer with following body:  

For a direct-cache tileset (FileSystem) stored in tiles/unique-layer-name  
```
{
  meta: {
    "name": "unique-layer-name",
    "type": "tiles"
  }
}
```
**NB: this tileset will be in status "created" and will await for a tile zip archive upload**

For a MBTiles tileset stored in tiles/unique-layer-name.mbtiles  
```
{
  meta: {
    "name": "unique-layer-name",
    "type": "mbtiles"
  }
}
```
**NB: this tileset will be in status "created" and will await for a mbtile upload**

For a retina tileset using remote TMS server  
```
{
  meta: {
    "name": "unique-layer-name",
    "type": "proxy",
    "source": "http://your.tile.server/{z}/{x}/{y}@2x.png",
    "retina": true
  }
}
```
**NB: this tileset will be in status "ready" and is able to be served directly**

For a vector tileset using remote TMS server  
```
{
  meta: {
    "name": "unique-layer-name",
    "type": "proxy",
    "source": "http://your.tile.server/style.json",
    "vector": true
  }
}
```
**NB: this tileset will be in status "ready" and is able to be served directly**

```POST /layers/upload/{layer}```  
Upload tiles.zip or mbtiles for specific layer

```DELETE /layers/{layer}```  
Delete layer

```DELETE /layers/flush/{layer}```  
Flush layer cache
