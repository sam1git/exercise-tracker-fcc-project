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

// setting up schema for data input to database
const dataSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

// construction model using desired dataSchema for data intput to database
const dataModel =  new mongoose.model('dataModel', dataSchema);

// Handles post request for entering new username
app.post('/api/users', (req, res) => {
  new dataModel({username: req.body.username, count: 0}).save()
    .then((data) => {
      console.log(`Saved new user data: ${data}`);
      res.status(201).json({
        username: data.username,
        _id: data["_id"]
      });
    })
    .catch((err) => {
      console.error(`New user data NOT saved: ${err}`);
      res.status(500).json({
        message: "Failed to create New User",
        Error: `${err}`
      });
    });
});

// Handles post request to add exercises to existing users.
app.post('/api/users/:_id/exercises', (req, res) => {
  let dataInput = {
    _id: req.body[":_id"],
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date
  };
  if (dataInput["_id"] === "" || dataInput.description == "" || dataInput.duration == "") {
    return res.status(500).json({
      Error: "Failed to submit data.",
      Message: "Do not leave any fields blank except date."
    });
  }
  if (dataInput.date === "") {
    dataInput.date = new Date().toDateString();
  } else {
    dataInput.date = new Date(dataInput.date).toDateString();
  };
  console.log(dataInput);
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
        return res.status(500).json({
          Error: "Failed to find ID.",
          Message: "Enter valid ID."
        });
    } else {
        return res.status(201).json({
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
app.get('/api/user', (req,res) => {
  DataModel.find()
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
