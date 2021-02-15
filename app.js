// Mongo DB CRUD Demo

// Modules
var mongoose = require('mongoose')
var express = require('express')
var fs = require('fs')

// express setup
var app = express()
var port = process.env.PORT || 3000

// Controllers
var personController = require('./controllers/personController')
var personSetup = require('./controllers/setupController')

// load mongo config
var mongoConfig = JSON.parse(fs.readFileSync(__dirname + '/config/mongo-config.json', 'utf8'));

var mongourl = mongoConfig.mongourl

// configure assets and vies
app.use('/assets', express.static(__dirname + '/public'))
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')


// connect to mongodb
mongoose.connect(mongourl)

// init controllers
personController(app, mongoose)
personSetup(app, mongoose)

// kick web server off
app.listen(port)

console.log('mongo client listening on port', port)