/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_flashcards")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number8294751036",
    "max": null,
    "min": 0,
    "name": "start_time",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date5632847129",
    "max": "",
    "min": "",
    "name": "due",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number1847295736",
    "max": null,
    "min": 0,
    "name": "stability",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number9374628150",
    "max": 10,
    "min": 1,
    "name": "difficulty",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "number5829374651",
    "max": null,
    "min": 0,
    "name": "elapsed_days",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number3847295162",
    "max": null,
    "min": 0,
    "name": "scheduled_days",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "number7294851637",
    "max": null,
    "min": 0,
    "name": "reps",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "number2847395681",
    "max": null,
    "min": 0,
    "name": "lapses",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "number9472850163",
    "max": null,
    "min": 0,
    "name": "learning_steps",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_flashcards")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  // update field
  collection.fields.addAt(4, new Field({
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
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date5632847129",
    "max": "",
    "min": "",
    "name": "due",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  // update field
  collection.fields.addAt(7, new Field({
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
  }))

  // update field
  collection.fields.addAt(8, new Field({
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
  }))

  // update field
  collection.fields.addAt(9, new Field({
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
  }))

  // update field
  collection.fields.addAt(10, new Field({
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
  }))

  // update field
  collection.fields.addAt(11, new Field({
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
  }))

  // update field
  collection.fields.addAt(12, new Field({
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
  }))

  // update field
  collection.fields.addAt(13, new Field({
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
  }))

  return app.save(collection)
})
