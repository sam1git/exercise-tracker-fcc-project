const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const mySecret = process.env['MANGO_URI']
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// set-up middleware to parse urlencoded data from html forms
app.use(express.urlencoded({extended: true}));

// connecting to database
mongoose.connect(mySecret, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log(`Connected to database.`))
  .catch((err) => console.error(err));

// setting up sub-schema for log
const logSubSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String
}, {_id: false});

// setting up schema for data input to database
const dataSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  count: Number,
  log: [logSubSchema]
});

// construction model using desired dataSchema for data intput to database
const dataModel =  new mongoose.model('dataModel', dataSchema);

// Handles post request for entering new username
app.post('/api/users', (req, res) => {
  new dataModel({username: req.body.username, count: 0}).save()
    .then((data) => {
      console.log(`Saved new user data: ${data}`);
      res.json({
        username: data.username,
        _id: data["_id"]
      });
    })
    .catch((err) => {
      console.error(`New user data NOT saved: ${err}`);
      res.json({
        message: "Failed to create New User",
        Error: `${err}`
      });
    });
});

// Handles post request to add exercises to existing users.
app.post('/api/users/:_id/exercises', (req, res) => {
  let dataInput = {
    //_id: req.body[":_id"], tests fails if I grab _id this way
    _id: req.params._id, // tests pass if I grab _id this way
    description: req.body.description,
    duration: +req.body.duration,
    date: req.body.date
  };
  if (!dataInput["_id"] || !dataInput.description || !dataInput.duration) {
    return res.json({
      Error: "Failed to submit data.",
      Message: "Do not leave any fields blank except date."
    });
  };
  if (!dataInput.date) {
    dataInput.date = new Date().toDateString();
  } else {
    dataInput.date = new Date(dataInput.date).toDateString();
  };
  dataModel.findByIdAndUpdate(
    dataInput["_id"],
    {$inc: {count: 1},
     $push: {log: {
       description: dataInput.description,
       duration: dataInput.duration,
       date: dataInput.date
     }}},
    {new: true, useFindAndModify: false},
    (err, data) => {
    if (err) {
      console.error(err);
    } else if (!data) {
        return res.json({
          Error: "Failed to find ID.",
          Message: "Enter valid ID."
        });
    } else {
        console.log(`Added exercise data: ${data}`);
        return res.json({
          username: data.username,
          description: dataInput.description,
          duration: dataInput.duration,
          date: dataInput.date,
          _id: data["_id"]
        });
    }
  });
});

// Handles get request to display all users
app.get('/api/users', (req, res) => {
  dataModel.find(
    {},
    {username: true, _id: true},
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        res.send(data);
      };
    }
  );
});

// Handles get request to display logs
app.get('/api/users/:_id/logs', (req, res) => {
  dataModel.findById(
    req.params["_id"],
    {username: 1, count: 1, _id: 1, log: 1},
    (err, data) => {
      if (err) {
        console.log(err);
        res.json({
          Error: "Failed to fetch data."
          });
      } else {
        if (!req.query.from && !req.query.to && !req.query.limit) {
          return res.json({
            username: data.username,
            count: data.count,
            _id: data["_id"],
            log: data.log
          });
        };
        if (req.query.from) {
          for (let i = data.log.length - 1; i >= 0; i--) {
            if (new Date(data.log[i].date) < new Date(req.query.from)) {
              data.log.splice(i,1);
            };
          };
        }
        if (req.query.to) {
          for (let i = data.log.length - 1; i >= 0; i--) {
            if (new Date(data.log[i].date) > new Date(req.query.to)) {
            data.log.splice(i,1);
            };
          };
        };
        if (req.query.limit) {
          data.log.splice(req.query.limit);
        };
        res.json({
          username: data.username,
          count: data.count,
          _id: data["_id"],
          log: data.log
        });
      }
    }
  );
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
