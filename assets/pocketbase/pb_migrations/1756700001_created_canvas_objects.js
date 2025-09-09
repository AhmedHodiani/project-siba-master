/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "relation2548472856",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "canvas_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation",
        "collectionId": "pbc_movie_canvases"
      },
      {
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
          "translation"
        ]
      },
      {
        "hidden": false,
        "id": "number137994776",
        "max": null,
        "min": null,
        "name": "x",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number257189377",
        "max": null,
        "min": null,
        "name": "y",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number3907799814",
        "max": null,
        "min": 0,
        "name": "z_index",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "json4729584163",
        "maxSize": 0,
        "name": "object_data",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "number8472950163",
        "max": null,
        "min": 0,
        "name": "complexity_score",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_canvas_objects",
    "indexes": [
      "CREATE INDEX `idx_canvas_objects_canvas_id` ON `canvas_objects` (`canvas_id`)",
      "CREATE INDEX `idx_canvas_objects_type` ON `canvas_objects` (`type`)",
      "CREATE INDEX `idx_canvas_objects_z_index` ON `canvas_objects` (`z_index`)",
      "CREATE INDEX `idx_canvas_objects_created` ON `canvas_objects` (`created`)"
    ],
    "listRule": null,
    "name": "canvas_objects",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_canvas_objects");

  return app.delete(collection);
});
