
const express = require('express');
var bodyParser = require('body-parser');
const multer=require('multer')

const route = require('./routes/route.js');

const app = express();


app.use(bodyParser.json());
app.use(multer().any())

const mongoose = require('mongoose')

mongoose.connect(
    "mongodb+srv://Satyaveer1994:Satyaveer123@cluster0.pn1nk.mongodb.net/satyaveer-DB", 
    {useNewUrlParser: true,useUnifiedTopology: true,  useCreateIndex: true}
)
    .then(() => console.log('mongodb is connected'))
    .catch(err => console.log(err))

app.use('/', route);

app.listen(process.env.PORT || 3000, function() {
	console.log('Express app running on port ' + (process.env.PORT || 3000))
});
