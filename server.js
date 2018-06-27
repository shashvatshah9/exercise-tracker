const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const mongoose = require('mongoose')

mongoose.connect(process.env.MLAB_URI)
const db = mongoose.connection

db.on('error', (err)=>{console.log('MongoDB connection error--> ',err)})
db.once('open', ()=>{console.log('Connection to MongoDB successful')})

app.use(cors({optioSuccessStatus: 200}))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

const Schema = mongoose.Schema

const exerciseSchema = new Schema({
  userId:{type: Schema.Types.ObjectId, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date : {type: Date, required:true}
})

const userSchema = new Schema({
  username : {type: String, required: true, unique: true}
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Excercise', exerciseSchema)

app.post('/api/exercise/new-user/', (req,res)=>{
  const username = req.body.username
  
  if(username === '' || username.length > 10 ){
    res.send('Invalid username')
  }
  else{
    const newUser = new User({
      username,
    });
  
  
    newUser.save((err,data)=>{
      if(err){
        if(err.name === 'MongoError' && err.code === 11000){
          res.send('Username already exists')
        }
        else{
          res.send('Error while saving the user')
        }
      }
      else{
        res.json(data)
      }
    });
  }
  
});


app.post('/api/exercise/add', (req, res) => {
  const username = req.body.username;
  const description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  let userId;

  if (username === undefined || description === undefined || duration === undefined) {
    res.send('Required Field(s) are missing.');
  } else if (username === '' || description === '' || duration === '') {
    res.send('Required Field(s) are blank.');
  } else if (username.length > 10) {
    res.send('Username cannot be greater than 10 characters');
  } else if (description.length > 100) {
    res.send('Description cannot be greater than 100 characters');
  } else if (isNaN(duration)) {
    res.send('Duration must be a number');
  } else if (Number(duration) > 1440) {
    res.send('Duration must be less than 1440 minutes (24 hours)');
  } else if (date !== '' && isNaN(Date.parse(date)) === true) {
    res.send('Date is not a valid date');
  } else {
    // Find userId for username
    User.findOne({ username }, (err, user) => {
      if (err) {
        res.send('Error while searching for username, try again');
      } else if (!user) {
        res.send('Username not found');
      } else {
        userId = user.id;

        // Valiidations passed, convert duration
        duration = Number(duration);

        // Valiidations passed, convert date
        if (date === '') {
          date = new Date();
        } else {
          date = Date.parse(date);
        }

        const newExercise = new Exercise({
          userId,
          description,
          duration,
          date,
        });

        newExercise.save((errSave, data) => {
          if (errSave) {
            res.send('Error occurred while saving exercise');
          } else {
            res.json(data);
          }
        });
      }
    });
  }
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
