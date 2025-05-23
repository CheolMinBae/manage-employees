// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("test");

// Find a document in a collection.
db.getCollection("schedules").findOne({
    userId: ObjectId("682f0563ec4216d4d2d166bf")
}); 