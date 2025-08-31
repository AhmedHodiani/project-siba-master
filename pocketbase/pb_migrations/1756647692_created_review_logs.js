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
        "id": "relation8472639105",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "flashcard_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation",
        "collectionId": "pbc_flashcards"
      },
      {
        "hidden": false,
        "id": "select7394628150",
        "maxSelect": 1,
        "name": "rating",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Manual",
          "Again",
          "Hard",
          "Good",
          "Easy"
        ]
      },
      {
        "hidden": false,
        "id": "select2847395016",
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
        "id": "date9374851629",
        "name": "due",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "number5847392016",
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
        "id": "number7492850163",
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
        "id": "number3847259160",
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
        "id": "number9472851036",
        "max": null,
        "min": 0,
        "name": "last_elapsed_days",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number2847395162",
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
        "id": "number5829374651",
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
        "id": "date8374629105",
        "name": "review_time",
        "presentable": false,
        "required": true,
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
    "id": "pbc_review_logs",
    "indexes": [
      "CREATE INDEX `idx_review_logs_flashcard_id` ON `review_logs` (`flashcard_id`)",
      "CREATE INDEX `idx_review_logs_review_time` ON `review_logs` (`review_time`)",
      "CREATE INDEX `idx_review_logs_rating` ON `review_logs` (`rating`)",
      "CREATE INDEX `idx_review_logs_created` ON `review_logs` (`created`)"
    ],
    "listRule": null,
    "name": "review_logs",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_review_logs");

  return app.delete(collection);
});