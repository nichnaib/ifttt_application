// Modules required
const async = require("async");
const middleware = require("./middleware");
const helpers = require("./helpers");
const express = require("express");
const request = require("request");
const twit = require("twit");
const parse = require("querystring");
const fs = require("fs");
const vision = require("@google-cloud/vision");
const bodyParser = require("body-parser");
const path = require("path");
const { google } = require("googleapis");

// --------------------------------------------------------------
// insert your keys in the matching folders (vision_config.json, drive_config.json, twitter_config.js, .env) and uncomment all


// API VISION
// const client = new vision.ImageAnnotatorClient({
//   keyFilename: "vision_config.json"
// });

// API DRIVE
// const drive_config = require("./drive_config.json");
// const scopes = ["https://www.googleapis.com/auth/drive"];
// const auth = new google.auth.JWT(
//   drive_config.client_email,
//   null,
//   drive_config.private_key,
//   scopes
// );
// const drive = google.drive({ version: "v3", auth });

// API TWITTER
// const twitter_config = require("./twitter_config");
// const T = new twit(twitter_config);

// IFTTT KEY
// const IFTTT_KEY = process.env.IFTTT_KEY;

// --------------------------------------------------------------

const app = express();

app.locals.s = "old";

var visibility_low = 0;
var visibility_medium = 0.5;
var visibility_high = 1;

var sensitivity = 0;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// The status
app.get("/ifttt/v1/status", middleware.serviceKeyCheck, (req, res) => {
  res.status(200).send();
});

// The test/setup endpoint
app.post("/ifttt/v1/test/setup", middleware.serviceKeyCheck, (req, res) => {
  res.status(200).send({
    data: {
      samples: {
        actionRecordSkipping: {
          create_new_thing: { invalid: "true" }
        }
      }
    }
  });
});

var bool = false;
function getViolation(sens, vis){
  return sens * vis;
}
// LABEL DETECTION
function label(){
  var start = new Date()
  client
    .labelDetection("/tmp/photo.jpg")
    .then(results => {
      const labels = results[0].labelAnnotations;
     // console.log(results)
      //console.log("labels: ");
      var end = new Date() - start
      // console.log("Tempo per contattare api vision: "+end+"ms")
      // score is intended as confidence, topicality as IMC (image content annotation)
      //  labels.forEach(label => console.log(label.description + " " + label.score))
      labels.forEach(function(label){
        if(bool === false){
          if ((label.description === "Natural environment" || label.description === "Natural landscape" || label.description === "Nature" || label.description === "Mountainous landforms" || label.description === "Landscape" || label.description === "Mountain") && label.score >= 0.7){
          sensitivity = 1
          bool = true;
          var v = getViolation(sensitivity,visibility_high)
          var violationTime = new Date() - start
          console.log("Violation Index: " +v)
        }
        else if ((label.description === "Face" || label.description === "People" || label.description === "Crowd" || label.description === "Audience" || label.description === "Social group" || label.description === "Community" || label.description === "Event" ) && label.score >= 0.7){
          bool = true;
          sensitivity = 2
          var v = getViolation(sensitivity,visibility_high)
          var violationTime = new Date() - start
         
        }
        else if ((label.description === "Debit card" || label.description === "Payment card" || label.description === "Credit card" || label.description === "Identity document" ||
            label.description === "Forehead") && label.score >= 0.7){
          bool = true;
          sensitivity = 3
          var v = getViolation(sensitivity,visibility_high)
          var violationTime = new Date() - start       
          console.log("Violation Index: " +v)          
        }
        }
        
        if (v < 3){
            tweetIt();
          console.log("Picture has been Tweeted!")
          }
      })
    })
  .catch(err => {
    console.log("error: " +err)
})
}

function detectText() {
  client.textDetection('/tmp/photo.jpg')
    .then(results => {
      const detections = results[0].textAnnotations;
      console.log('Text:');
      detections.forEach(text => console.log(text));
      // [END vision_text_detection]
    })
}
          
// // LANDMARK DETECTION maxResult nella post request è settato a 10, potrei avere più risultati però
function landmark(){
  client
    .landmarkDetection('/tmp/photo.jpg')
    .then(results => {
      // console.log(results)
       const landmarks = results[0].landmarkAnnotations;
       console.log('Landmarks:');
       landmarks.forEach(landmark => console.log(landmark.description + " " + landmark.score));
   })
  .catch(err => {
    console.log("error: " +err)
})
}
// // FACE DETECTION
function face(){
  client
  .faceDetection('/tmp/photo.jpg')
  .then(results => {
  const faces = results[0].faceAnnotations;
  console.log('Faces:');
  faces.forEach((face, i) => {
  console.log(face)
  console.log(`  Face #${i + 1}:`);
  console.log(`    Joy: ${face.joyLikelihood}`);
  console.log(`    Anger: ${face.angerLikelihood}`);
  console.log(`    Sorrow: ${face.sorrowLikelihood}`);
  console.log(`    Surprise: ${face.surpriseLikelihood}`);
  })
})
  .catch(err => {
    console.log("error: " +err)
})
}

var pageToken;
drive.changes.getStartPageToken({}, function (err, res) {
  //console.log('Start token:', res.data.startPageToken);
  pageToken = res.data.startPageToken;
})
// Using the NPM module 'async'
async.doWhilst(
  function(callback) {
    drive.files.list(
      {
        q: "modifiedTime > '2019-11-01T12:00:00' and 	mimeType != 'application/vnd.google-apps.folder'",
        fields: "nextPageToken, files(id, name, imageMediaMetadata)",
        spaces: "drive",
        pageToken: pageToken
      },
      function(err, res) {
        if (err) {
          // Handle error
          console.error(err);
          callback(err);
        } else {
          res.data.files.forEach(function(file) {
            //console.log("Found file: ", file.name, file.id, file.imageMediaMetadata);
          });

          callback();
        }
      }
    );
  },
  function() {
    return !!pageToken;
  },
  function(err) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      // All pages fetched
    }
  }
);

function tweetIt(){
  var inizioTweet = new Date()
  var b64content = fs.readFileSync('/tmp/photo.jpg', { encoding: 'base64' })
  T.post('media/upload', { media_data: b64content }, function (err, data, response){

    var mediaIdStr = data.media_id_string
    var altText ="a test image"
    var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

    T.post('media/metadata/create', meta_params, function (err, data, response) {
      if (!err) {
        var params = { status: '#test', media_ids: [mediaIdStr] }
        T.post('statuses/update', params, function (err, data, response) {
          var e = new Date()
          var end = e.getTime()
          var fineTweet = new Date() - inizioTweet
        });
      }
    });
  });
}

function change(){
var i = new Date()
var inizio = i.getTime()

async.doWhilst(function (callback) {
  drive.changes.list({
    pageToken: pageToken,
    fields: '*'
  }, function (err, res) {
    if (err) {
      callback(err);
    } else {
      var id;
      // Process changes
      res.data.changes.forEach(function (change) {
        var fineChanges = new Date() - i

        id = change.fileId
        console.log('Change found for file:', change.fileId);  
        bool = false;
      });
      var dest = fs.createWriteStream('/tmp/photo.jpg')
      //console.log(id)
      drive.files.get(
      { fileId: id, alt: "media" },
      { responseType: "stream" },
      function(err, res) {
        if (res != undefined){
                  res.data
          .on("end", () => {
            console.log("Done");
            // check the label into the image
            label()
            // uncomment the check you want to do 
            //detectText()
            //landmark()
            //face()
            //tweetIt();
                    
          })
          .on("error", err => {
            console.log("Error", err);
          })
          .pipe(dest);
        } 
      })
      pageToken = res.data.nextPageToken;
      callback(res.data.newStartPageToken);
    }
  });
}, function () {
  return !!pageToken
}, function (err, newStartPageToken) {
  //console.log('Done fetching changes');
  //console.log(err)
  pageToken = err
});
}



setInterval(change, 10000)


// if you want to execute via app
//----------------------------------------------------------------------------------------------------------------------------------
// Trigger endpoints

app.post("/ifttt/v1/triggers/get_photo", (req, res) => {
  const key = req.get("IFTTT-Service-Key");

  if (key !== IFTTT_KEY) {
    res.status(401).send({
      errors: [
        {
          message: "Channel/Service key is not correct"
        }
      ]
    });
  }

  let data = [],
    numOfItems = req.body.limit;

  if (typeof numOfItems === "undefined") {
    // Setting the default if limit doesn't exist.
    numOfItems = 3;
  }

  if (numOfItems >= 1) {
    for (let i = 0; i < numOfItems; i += 1) {
      data.push({
        created_at: new Date().toISOString(), // Must be a valid ISOString
        meta: {
          id: helpers.generateUniqueId(),
          timestamp: Math.floor(Date.now() / 1000) // This returns a unix timestamp in seconds.
        }
      });
    }
  }

  var result = [];
  var arrayFileDates = [];
  drive.files.list(
    { fields: "files(name, webViewLink, createdTime)" },
    function(err, res) {
      if (err) throw err;
      const files = res.data.files;
      if (files.length) {
        files.map(file => {
          var name = file.name;
          var link = file.webViewLink;
          var time = file.createdTime;
          var s = "https://drive.google.com/file/d/";
          if (link.includes(s)) {
            s = link.substring(32, 65);
            var date = new Date(time);
            arrayFileDates.push(date);
            result.push(date, s);
          } else {
            return;
          }
        });

        arrayFileDates.sort(function(a, b) {
          return b - a;
        });
        var lastUploadDate = arrayFileDates[0];
        for (var i = 0; i < result.length; i++) {
          if (result[i] == lastUploadDate) {
            app.locals.s = result[i + 1];

            console.log("link corretto: " + app.locals.s);
          }
        }
      } else {
        console.log("No files found");
      }
    }
  );

  var dest = fs.createWriteStream("/tmp/photo.jpg");
  drive.files.get(
    { fileId: app.locals.s, alt: "media" },
    { responseType: "stream" },
    function(err, res) {
      res.data
        .on("end", () => {
          console.log("Done");
        })
        .on("error", err => {
          console.log("Error", err);
        })
        .pipe(dest);
    }
  );

  res.status(200).send({
    data: data
  });
});

// Action endpoints
app.post("/ifttt/v1/actions/social_upload", (req, res) => {
  const key = req.get("IFTTT-Service-Key");

  if (key !== IFTTT_KEY) {
    res.status(401).send({
      errors: [
        {
          message: "Channel/Service key is not correct"
        }
      ]
    });
  }


  //  post tweet
  //   var tweet = {
  //     status: "Test Tweet!"
  //   }

  //   T.post('statuses/update', tweet, tweeted)

  //   function tweeted (err, data, response){
  //     if(err) {
  //       console.log(err);
  //     } else {
  //       console.log("ok");
  //     }

  //   };
  //   post photo

  //function tweetIt(){
  //   var b64content = fs.readFileSync('/tmp/photo.jpg', { encoding: 'base64' })
  //   T.post('media/upload', { media_data: b64content }, function (err, data, response){

  //     var mediaIdStr = data.media_id_string
  //     var altText ="a test image"
  //     var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

  //     T.post('media/metadata/create', meta_params, function (err, data, response) {
  //       if (!err) {
  //         var params = { status: '#test', media_ids: [mediaIdStr] }
  //         T.post('statuses/update', params, function (err, data, response) {
  //           console.log(data)
  //         });
  //       }
  //     });
  //   });
  //}

  res.status(200).send({
    data: [
      {
        id: helpers.generateUniqueId()
      }
    ]
  });
});

// listen for requests :)
app.get("/", (req, res) => {
  res.render("index.ejs");
});

const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

