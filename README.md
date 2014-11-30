basic-express-mongodb
=====================

This is the most basic express server that connects to a local mongoDb database using promised-mongo

Just run npm install and go to localhost:3000/users
Returns the content of the "myCollection" collection in the "myDb" database.

If you manually want to add content to that db just open terminal:
1 - mongod
2 - mongo (in another tab)
3 - use myDb
4 - db.myCollection.save({username: 'John Doe', city: 'San Francisco'})

Only one route for now /users
