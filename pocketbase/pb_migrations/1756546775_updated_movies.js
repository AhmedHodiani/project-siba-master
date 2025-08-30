/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_movies")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number137994776",
    "max": null,
    "min": null,
    "name": "srt_delay",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number257189377",
    "max": null,
    "min": 0,
    "name": "last_position",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_movies")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number137994776",
    "max": null,
    "min": null,
    "name": "srt_delay",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number257189377",
    "max": null,
    "min": 0,
    "name": "last_position",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
