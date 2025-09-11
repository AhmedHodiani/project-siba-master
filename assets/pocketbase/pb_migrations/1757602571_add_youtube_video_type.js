/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_canvas_objects")

  // update field - add "youtube-video" to the type select values
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "select8394756281",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "freehand",
      "sticky-note",
      "flashcard",
      "translation",
      "image",
      "youtube-video"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_canvas_objects")

  // revert field - remove "youtube-video" from the type select values
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "select8394756281",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "freehand",
      "sticky-note",
      "flashcard",
      "translation",
      "image"
    ]
  }))

  return app.save(collection)
})
