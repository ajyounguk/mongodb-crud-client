var mongoose = require('mongoose')

// data 
var Schema = mongoose.Schema

var personSchema = new Schema({
    firstname: String,
    surname: String,
    telephone: String
})

// person schema for mongo 
var Person = mongoose.model('Person', personSchema)

module.exports = Person