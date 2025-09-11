/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_canvas_objects")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "file104153177",
    "maxSelect": 5,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "files",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_canvas_objects")

  // remove field
  collection.fields.removeById("file104153177")

  return app.save(collection)
})
