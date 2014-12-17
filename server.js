var express = require("express");
var cors = require("cors");
var pmongo = require("promised-mongo");
var db = pmongo("mongodb://127.0.0.1:27017/myDb", ["myCollection"]);
// 'mongodb://127.0.0.1:27017/test'
var graph = require('fbgraph');
var __ = require('underscore');

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
            "client_id":     conf.client_id,
            "redirect_uri":  conf.redirect_uri,
            "scope":         conf.scope
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

    var me = {};
    var friendsArr = [];

    // what you need? 
    // a save to db function
    // a create friends array function

    // Fb call to get user information
    graph.get('/me', function(err, data) {
    console.log('User id:', data.id);

    // console.log('User Found:', db.myCollection.find());

    me = data;
    // friendsArr = _.pluck(me.

    db.myCollection.find({id: me.id}).toArray().then(function(result){
        console.log('Docs:', result);

        // if the user exists here
            // 1) we build a friends array (let's use uderscore's pluck)
            // 2) we update the user info
            // 3) verify if the user friends array is the same
                // yes, we do nothing
                // no, we add it to the friends property with the new date

        if(result.length) console.log('yes');
        res.send(result);
    });

    // res.send(db.myCollection.find());

    // Step 1 look for the user in the database --> db.mycollection.find({id: data.id})
        // A - the user doesn't exist 
            // save the user and create a friends array in a friends property with the date --> db.mycollection.save(data)

        // B - the user exists in the database 
            // update the user and add a new friends array to the friends property with the date
        
        // db.myCollection.save(data).then(function(docs){
        //  res.send({user: docs});
        // });
    });

    // here we build the friends array
    graph.get('/me/friends?fields=id,name,birthday,hometown,location,education,gender,interested_in,relationship_status,timezone,languages,locale', function(err, data) {
        // console.log('Friends:', data);
        friendsArr = __.pluck(data.data, 'id'); 
        console.log(friendsArr);
        console.log(friendsArr.length);
        // console.log(friendsArr);
    });
});

app.listen(3000);
