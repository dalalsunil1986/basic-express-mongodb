var express = require('express');
var cors = require('cors');
var Promise = require('bluebird');
var pmongo = require('promised-mongo');
var db = Promise.promisifyAll(pmongo('mongodb://127.0.0.1:27017/myDb', ['myCollection']));
var graph = Promise.promisifyAll(require('fbgraph'));
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
    var allFriends = [];
    var friendsString = '?fields=id,name,birthday,hometown,location,education,gender,interested_in,relationship_status,timezone,languages,locale';
    
    Promise.all([graph.getAsync('/me'), graph.getAsync('/me/friends' + friendsString)])
    // graph.getAsync('/me')
    .then(function(data){
        // User Object
        newUserObj = data[0];

        // Friends Object
        allFriends = data[1].data;
        // console.log(allFriends);
        friendsIdObj = {date: new Date(), friends: __.pluck(data[1].data, 'id')}
    })
    .then(function(){
        return db.myCollection.findOne({id: newUserObj.id})
    })
    .then(function(dbUserObj){
        if(!dbUserObj){
            newUserObj.allFriendsId = [];
            newUserObj.allFriendsId.push(friendsIdObj);

            return db.myCollection.save(newUserObj)
        }
        else{
            console.log('----------------------------------------');

            // we add the current (the most updated) friends array to the newUserObj
            newUserObj.allFriendsId = dbUserObj.allFriendsId;
            
            // if the last friends array didn't change we still update the rest of the user information
            if(__.difference(dbUserObj.allFriendsId[dbUserObj.allFriendsId.length - 1].friends, friendsIdObj.friends).length === 0){
                                        
                // we update the user in the database
                return db.myCollection.update({id: dbUserObj.id}, newUserObj);
            }
            else{
                newUserObj.allFriendsId.push(friendsIdObj);
                return db.myCollection.update({id: dbUserObj.id}, newUserObj);
            }
        }
    })
    .then(function(){
        return db.myCollection.find({ id: { $in: friendsIdObj.friends } }).toArray();
    })
    .then(function(data){

        var mixedArr = [];

        if(data.length > 0){
            var newFriends = __.indexBy(allFriends, 'id');

            __.each(data, function(friendInDb){
                delete newFriends[friendInDb.id]
            });

            __.each(newFriends, function(friend){
                mixedArr.push(friend);
            });

            mixedArr = mixedArr.concat(data);

            return mixedArr;
        }
        else
        {
            return allFriends;
        }
    })
    .then(function(data){
        
        __.map(data, function(friend){
            delete friend['_id'];
            delete friend.id;
            delete friend.name;
            return friend;
        });

        delete newUserObj.allFriendsId;

        var finalArr = {
            me: newUserObj,
            friends: data
        };
        res.send({atTheEnd: finalArr, lengthFriends: finalArr.friends.length});
    })
});
app.listen(3000);
