var express = require("express");
var cors = require("cors");
var pmongo = require("promised-mongo");
var db = pmongo("myDb", ["myCollection"]);
var graph = require('fbgraph');

var app = express();

app.use(cors());


// fbgraph
var conf = {
	client_id:      process.env.APP_ID || 'YOUR-APP-ID',
	client_secret:  process.env.APP_SECRET || 'YOUR-APP-SECRET',
	scope:          'email, user_about_me, friends_about_me, user_birthday, friends_birthday, user_education_history, friends_education_history, user_hometown, friends_hometown, user_interests, friends_interests, user_likes, friends_likes, user_location, friends_location, user_photos, friends_photos, user_relationships, friends_relationships, user_relationship_details, friends_relationship_details, user_work_history, friends_work_history, read_friendlists,user_relationships',
	redirect_uri:   process.env.REDIRECT_URI || 'http://localhost:3000/auth/facebook'
};

app.get('/auth/facebook', function(req, res) {
  
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     conf.client_id
      , "redirect_uri":  conf.redirect_uri
      , "scope":         conf.scope
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {
      res.send('access denied');
    }
    return;
  }

  // code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      conf.client_id,
      "redirect_uri":   conf.redirect_uri,
      "client_secret":  conf.client_secret,
      "code":           req.query.code
  }, function (err, facebookRes) {
    // We redirect to /user 
    res.redirect('/user');
  });
});

app.get('/user', function(req, res){
	graph.get('/me', function(err, data) {
		
		db.myCollection.save({user: data}).then(function(docs){
			res.send({user: docs});
		});
		
	});
});

// End fbgraph

// app.get("/users", function (req, res) {

//     db.myCollection.find().toArray().then(function(docs){
//         // docs is an array of all the documents in myCollection
//         console.log(docs);
//         res.send({ users: docs, length: docs.length });
//     });
// });

app.listen(3000);
