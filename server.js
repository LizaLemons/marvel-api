
/* run `nodemon` ---> localhost:3000 */
/* For production, change mongoURL & port vars */

const express       = require('express');
const app           = express();
const cors          = require('cors');
const bodyParser    = require('body-parser');
const request       = require('request');
const md5           = require('md5'); // algor. that scrambles up data & returns a hash
const mongodb       = require('mongodb');
const MongoClient   = require('mongodb').MongoClient;

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));

/* Local */
// const mongoUrl = 'mongodb://localhost:27017';
// const dbName = 'marvel_db';

/* heroku mongo URL: */
// const mongoUrl = 'mongodb://heroku_z61ltqdr:barui01gapagu1spgue4ppcfu1@ds023465.mlab.com:23465/heroku_z61ltqdr';
// const dbName = 'heroku_z61ltqdr';

const mongoUrl = "mongodb://heroku_lcvv0b2f:5oavh02srp7lsk4bbg28gopj3t@ds229701.mlab.com:29701/heroku_lcvv0b2f";
const dbName = "heroku_lcvv0b2f";


/***************** our backend routes *****************/

/* welcome page */
app.get('/', function(request, response){
  response.json({"description": "Welcome to the MARVEL API demo"});
});

/***************** `marvel` endpoint *****************/

/* marvel search */
app.post('/marvel/search', function(req, res) {

  /*
  example of a full query to Marvel:
  http://gateway.marvel.com:80/v1/public/characters?ts=1468935564884&apikey=a84d62b5bd7673df78f442876bf34b83&hash=ffdd7dd65eec8d8f651b74bec7a1d603&name=hulk
  */

  var baseUrl = "http://gateway.marvel.com:80/v1/public/";
  var endpoint = "characters";
  var tsQueryString = '?ts=';
  var ts = Date.now();
  var apiKeyQueryString = "&apikey=";
  var MARVEL_PUBLIC_API_KEY = process.env.MARVEL_PUBLIC_API_KEY;
  var MARVEL_PRIVATE_API_KEY = process.env.MARVEL_PRIVATE_API_KEY;
  var hashQueryString = '&hash='
  var hash = md5( ts + MARVEL_PRIVATE_API_KEY + MARVEL_PUBLIC_API_KEY);
  var queryString = `&name=${req.body.charName}`

  var fullQuery = baseUrl + endpoint + tsQueryString + ts + apiKeyQueryString + MARVEL_PUBLIC_API_KEY + hashQueryString + hash + queryString;
  console.log("fullQuery:", fullQuery);

  request({
    url: fullQuery,
    method: 'GET',
    callback: function(error, response, body) {
      res.send(body);
    }
  })

}); // end post request

/***************** routes for `favorites` endpoint *****************/

/* get all */
app.get('/favorites', function(request, response){

  MongoClient.connect(mongoUrl, {useNewUrlParser: true}, function(err, client) {
    let db = client.db(dbName);
    let favoritesCollection = db.collection('favorites');

    if (err) {
      console.log('Unable to connect to the mongoDB server. ERROR:', err);
    } else {
      favoritesCollection.find().toArray(function (err, result) {
        if (err) {
          console.log("ERROR!", err);
          response.json("error");
        } else if (result.length) {
          console.log('Found:', result);
          response.json(result);
        } else {
          console.log("RESULT:", result);
          console.log('No document(s) found with defined "find" criteria');
          response.json(0);
        }
      }); /* end find */
    } /* end else */

    // client.close(function() {
    //   console.log( "database CLOSED");
    // });

  }) /* end mongo connect */
}); /* end get all */

/* add new */
app.post('/favorites/new', function(request, response){
  MongoClient.connect(mongoUrl, {useNewUrlParser: true}, function(err, client) {
    let db = client.db(dbName);
    let favoritesCollection = db.collection('favorites');

    if (err) {
      console.log('Unable to connect to the mongoDB server. ERROR:', err);
    } else {
      /* dupe check: find by marvel_id */
      let findCriteria = {marvel_id: request.body.marvel_id}

      favoritesCollection.find(findCriteria).toArray(function (err, result) {
        if (err) {
          console.log("ERROR!", err);
          response.json("error");
        } else if (result.length) { /* already exists */
          console.log("This character is already in your faves.");
          response.json("This character is already in your faves.");
        } else { /* insert new one */
          console.log('No document(s) found with defined "find" criteria');

          /* Insert */
          let newFavorite = request.body;
          favoritesCollection.insert(newFavorite, function (err, result) {
            if (err) {
              console.log(err);
              response.json("error");
            } else {
              console.log('Inserted.');
              console.log('RESULT!!!!', result);
              console.log("end result");
              response.json(result);
            }
          }); /* end insert */

        } /* end else */
      }); /* end .find */
    } /* end else */

    /* why does this err? */
    // client.close(function() {
    //   console.log( "database CLOSED");
    // });

  }) /* end mongo connect */
}); /* end add new */

/* delete */
app.delete('/favorites/:marvel_id', function(request, response) {
  MongoClient.connect(mongoUrl, {useNewUrlParser: true}, function(err, client) {
    let db = client.db(dbName);
    let favoritesCollection = db.collection('favorites');

    console.log("request.params:", request.params);

    if (err) {
      console.log('Unable to connect to the mongoDB server. ERROR:', err);
    } else {
      console.log('Deleting by marvel_id... ');

      favoritesCollection.remove(request.params, function(err, numOfRemovedDocs) {
        if(err) {
          console.log("error!", err);
        } else { /* after deletion, retrieve list of all */
          favoritesCollection.find().toArray(function (err, result) {
            if (err) {
              console.log("ERROR!", err);
              response.json("error");
            } else if (result.length) { /* return updated list of faves */
              console.log('Found:', result);
              response.json(result);
            } else { /* faves is now empty */
              console.log('No faves');
              response.json("No faves");
            }
          }); /* end find */
        } /* end else */
      }); /* end remove */
    } /* end else */

    // client.close(function() {
    //   console.log( "database CLOSED");
    // });

  }) /* end mongo connect */
}); // end delete


/***************** port stuff *****************/

// PORT = 3000; /* local: */
PORT = process.env.PORT || 80; /* production: */

/* tell our app where to listen */
app.listen(PORT, function(){
  console.log(`Listening to events on port ${PORT}.`)
});
