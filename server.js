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

//  Routing
app.get('/user', function(req, res){

    var newUserObj = {};
    var friendsIdObj = {};
    var dbUserObj = {};
    var allFriends = [];
    var friendsString = '?fields=id,name,birthday,hometown,location,education,gender,interested_in,relationship_status,timezone,languages,locale';

    graph.get('/me', function(err, data) {
        newUserObj = data; // we assign the result of the graph call
        
        // we look for that user in db
        db.myCollection.findOne({id: newUserObj.id}).then(function(result){
            dbUserObj = result;
            console.log('dbUserObj:', dbUserObj);
            
            graph.get('/me/friends' + friendsString, function(err, data) {

                allFriends = data.data;
                console.log('allFriends:', allFriends);
                console.log('allFriends length:', allFriends.length);
                friendsIdObj = {date: new Date(), friends: __.pluck(data.data, 'id')} // we create the friends object
            
                if(!dbUserObj){
                    newUserObj.allFriendsId = [];
                    newUserObj.allFriendsId.push(friendsIdObj);

                    db.myCollection.save(newUserObj).then(function(docs){
                        res.send({user: docs});
                    });
                }
                else{
                    console.log('----------------------------------------');
                    // console.log('friends from Facebook:', friendsIdObj.friends);
                    // console.log('friends in db:', dbUserObj.allFriendsId[dbUserObj.allFriendsId.length - 1].friends);

                    // we add the current (the most updated) friends array to the newUserObj
                    newUserObj.allFriendsId = dbUserObj.allFriendsId;
                    
                    // if the last friends array didn't change we still update the rest of the user information
                    if(__.difference(dbUserObj.allFriendsId[dbUserObj.allFriendsId.length - 1].friends, friendsIdObj.friends).length === 0){
                                                
                        // we update the user in the database
                        db.myCollection.update({id: dbUserObj.id}, newUserObj).then(function(docs){
                            res.send('Same Friends');
                        });
                    }
                    else{
                        newUserObj.allFriendsId.push(friendsIdObj);
                        
                        db.myCollection.update({id: dbUserObj.id}, newUserObj).then(function(docs){
                            res.send('different Friends, user Updated now');
                        });
                    }
                }

                // now that the login process is in place. let's send the actual information that is gonna get parsed by the front end

                __.map(allFriends, function(friend){
                    db.myCollection.findOne({id: friend.id}).then(function(result){
                        // console.log('hello: ', result ? result : friend);
                        return result ? result : friend;
                    });
                });

                console.log('Those are all filtered friends:', allFriends);
            })
        });
    });
});
app.listen(3000);
