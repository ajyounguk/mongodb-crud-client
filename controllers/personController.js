module.exports = function(app, mongoose) {

    var bodyParser = require('body-parser')
    var urlencodedParser = bodyParser.urlencoded({extended: false})

     // data 
     var Schema = mongoose.Schema

     var personSchema = new Schema({
         firstname: String,
         surname: String,
         telephone: String
     })

     // person schema for mongo 
     var Person = mongoose.model('Person', personSchema)
   
    // serve up index
    app.get('/', function (req, res) {
        res.render('./index')
    })

    // 1. Add Person
    app.post('/person', urlencodedParser, function (req, res) {

       // setup data in the model
        var personModel = Person ({
            firstname: req.body.firstname,
            surname: req.body.surname,
            telephone: req.body.telephone    
        })

       personModel.save(function (err) {
           if (err) throw err 
           else {
               res.status(201)
               res.render('./confirm_person_add', personModel)
           }
       })

    })

    // 2. List personS
    app.get('/person', function (req, res) {


        Person.find( {}, function(err, persons) {
            if (err) throw (err)
            else {
                
                res.status(200)
                res.render('./list_person', { "personList" : persons })
            }
        })
    })
 


    // 3. Add Person
    app.post('/person/update', urlencodedParser, function (req, res) {

        if (! mongoose.Types.ObjectId.isValid(req.body.mongoid)) {
            res.status(500) 
            res.render('./confirm_person_update', { "_id" : "ERROR Invalid Mongo ID" })
         }

        // setup update data in the model
         var newPerson = {
             firstname: req.body.firstname,
             surname: req.body.surname,
             telephone: req.body.telephone    
         }

        Person.findByIdAndUpdate( req.body.mongoid, newPerson, function (err, person) {
            if (err) {
                console.log('update error', err)
            } else {
                if (person) {
                    res.status(200)
                    person['newfirstname'] = req.body.firstname
                    person['newsurname'] = req.body.surname
                    person['newtelephone'] = req.body.telephone

                    res.render('./confirm_person_update', person )
                } else {
                    res.status(404)
                    res.render('./confirm_person_update', { "_id" : "ERROR Mongo ID Not Found" })
                }
            }
        })
     })
 

    // 4. Delete Persons
    app.post('/person/delete', urlencodedParser, function(req, res) {

        if (! mongoose.Types.ObjectId.isValid(req.body.mongoid)) {
            res.status(500) 
            res.render('./confirm_person_del', { "_id" : "ERROR Invalid Mongo ID" })
        }

        Person.findByIdAndRemove( req.body.mongoid, function (err, person) {
            if (err) {
                res.status(500) 
                res.render(err)
            } else {
                if (person) {
                    console.log(person)
                    res.status(202)
                    res.render('./confirm_person_del', person )
                } else {
                    res.status(404)
                    res.render('./confirm_person_del', { "_id" : "ERROR Mongo ID Not Found" })
                }
            }
        })
    })

    
    
    
}