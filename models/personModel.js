var mongoose = require('mongoose')

// data 
var Schema = mongoose.Schema

var personSchema = new Schema({
    firstname: String,
    surname: String,
    telephone: String
})

// person schema for mongo 
// schema in this context defines the collection in the db (db defined in mongo config connection string)
var Person = mongoose.model('Person', personSchema)

module.exports = Person