const mongoose = require('mongoose')

// Person schema. The model name 'Person' maps to the 'people' collection
// in whichever database the connection string names.
const personSchema = new mongoose.Schema({
    firstname: { type: String, required: true, trim: true, maxlength: 100 },
    surname: { type: String, required: true, trim: true, maxlength: 100 },
    telephone: {
        type: String,
        required: true,
        trim: true,
        match: [/^[0-9+()\-. ]{3,30}$/, 'telephone may only contain digits, spaces and + ( ) - .']
    }
}, {
    versionKey: false
})

module.exports = mongoose.models.Person || mongoose.model('Person', personSchema)
