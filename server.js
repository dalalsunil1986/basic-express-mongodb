var express = require("express");
var cors = require("cors");
var pmongo = require("promised-mongo");
var db = pmongo("myDb", ["myCollection"]);

var app = express();

app.use(cors());

app.get("/users", function (req, res) {

    db.myCollection.find().toArray().then(function(docs){
        // docs is an array of all the documents in myCollection
        console.log(docs);
        res.send({ users: docs, length: docs.length });
    });
});

app.listen(3000);
