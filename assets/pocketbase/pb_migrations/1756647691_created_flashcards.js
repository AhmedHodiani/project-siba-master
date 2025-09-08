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
        "name": "movie_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation",
        "collectionId": "pbc_movies"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1298374653",
        "max": 2000,
        "min": 1,
        "name": "subtitle_text",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "editor3847592841",
        "maxSize": 0,
        "name": "free_space",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "editor"
      },
      {
        "hidden": false,
        "id": "number8294751036",
        "max": null,
        "min": 0,
        "name": "start_time",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number9847562103",
        "max": null,
        "min": 0,
        "name": "end_time",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date5632847129",
        "name": "due",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "number1847295736",
        "max": null,
        "min": 0,
        "name": "stability",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number9374628150",
        "max": 10,
        "min": 1,
        "name": "difficulty",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number5829374651",
        "max": null,
        "min": 0,
        "name": "elapsed_days",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number3847295162",
        "max": null,
        "min": 0,
        "name": "scheduled_days",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number7294851637",
        "max": null,
        "min": 0,
        "name": "reps",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number2847395681",
        "max": null,
        "min": 0,
        "name": "lapses",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number9472850163",
        "max": null,
        "min": 0,
        "name": "learning_steps",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select8394756281",
        "maxSelect": 1,
        "name": "state",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "New",
          "Learning", 
          "Review",
          "Relearning"
        ]
      },
      {
        "hidden": false,
        "id": "date7294851639",
        "name": "last_review",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
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
    "id": "pbc_flashcards",
    "indexes": [
      "CREATE INDEX `idx_flashcards_movie_id` ON `flashcards` (`movie_id`)",
      "CREATE INDEX `idx_flashcards_due` ON `flashcards` (`due`)",
      "CREATE INDEX `idx_flashcards_state` ON `flashcards` (`state`)",
      "CREATE INDEX `idx_flashcards_created` ON `flashcards` (`created`)"
    ],
    "listRule": null,
    "name": "flashcards",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_flashcards");

  return app.delete(collection);
});