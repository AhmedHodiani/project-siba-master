/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_movie_canvases")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number137994776",
    "max": null,
    "min": null,
    "name": "viewport_x",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number257189377",
    "max": null,
    "min": null,
    "name": "viewport_y",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number8472950163",
    "max": null,
    "min": 0,
    "name": "object_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_movie_canvases")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number137994776",
    "max": null,
    "min": null,
    "name": "viewport_x",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number257189377",
    "max": null,
    "min": null,
    "name": "viewport_y",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number8472950163",
    "max": null,
    "min": 0,
    "name": "object_count",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
