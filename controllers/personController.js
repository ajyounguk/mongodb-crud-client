module.exports = function (app, mongoose) {

    var ui = {
        menuitem: 1,
        data: []
    }

    var Person = require('../models/personModel')
    var bodyParser = require('body-parser')
    var urlencodedParser = bodyParser.urlencoded({
        extended: false
    })

    // serve up index
    app.get('/', function (req, res) {

        // reset ui data
        ui = {
            menuitem: 1,
            data: []
        }

        res.render('./index', {
            ui: ui
        })
    })

    // 1. Add Person
    app.post('/person', urlencodedParser, function (req, res) {

        // setup data in the model
        var personModel = Person({
            firstname: req.body.firstname,
            surname: req.body.surname,
            telephone: req.body.telephone
        })

        ui.menuitem = 1
        ui.data[ui.menuitem] = {
            status: '',
            action: '',
            data: ''
        }

        personModel.save(function (err) {
            if (err) {
                ui.data[ui.menuitem].status = '500'
                ui.data[ui.menuitem].data = err
            } else {
                ui.data[ui.menuitem].status = '201'
                ui.data[ui.menuitem].data = personModel
            }

            ui.data[ui.menuitem].action = 'create'
            res.render('./index.ejs', {
                ui: ui
            })
        })

    })

    // 2. List persons
    app.get('/person', function (req, res) {

        Person.find({}, function (err, persons) {

            ui.menuitem = 2
            ui.data[ui.menuitem] = {
                status: '',
                action: '',
                data: ''
            }

            if (err) {
                ui.data[ui.menuitem].status = '500'
                ui.data[ui.menuitem].data = err
            } else {
                ui.data[ui.menuitem].status = '200'
                ui.data[ui.menuitem].data = persons
            }

            ui.data[ui.menuitem].action = 'read'
            res.render('./index.ejs', {
                ui: ui
            })
        })
    })



    // 3. Add Person
    app.post('/person/update', urlencodedParser, function (req, res) {

        if (!mongoose.Types.ObjectId.isValid(req.body.mongoid)) {
            res.status(500)
            res.render('./confirm_person_update', {
                "_id": "ERROR Invalid Mongo ID"
            })
        }

        // setup update data in the model
        var newPerson = {
            firstname: req.body.firstname,
            surname: req.body.surname,
            telephone: req.body.telephone
        }

        Person.findByIdAndUpdate(req.body.mongoid, newPerson, function (err, person) {

            ui.menuitem = 3
            ui.data[ui.menuitem] = {
                status: '',
                action: '',
                data: ''
            }

            if (err) {
                ui.data[ui.menuitem].status = '500'
            } else {
                ui.data[ui.menuitem].status = '200'
                ui.data[ui.menuitem].data = {
                    oldPerson: person,
                    newPerson: newPerson
                }
            }

            ui.data[ui.menuitem].action = 'update'
            res.render('./index.ejs', {
                ui: ui
            })
        })
    })


    // 4. Delete Persons
    app.post('/person/delete', urlencodedParser, function (req, res) {

        ui.menuitem = 4
        ui.data[ui.menuitem] = {
            status: '',
            action: '',
            data: ''
        }

        // is id valid?
        if (!mongoose.Types.ObjectId.isValid(req.body.mongoid)) {
            res.status(500)
            ui.data[ui.menuitem].status = '500'
            ui.data[ui.menuitem].data = ui.data[ui.menuitem].status = '500'
            ui.data[ui.menuitem].data = req.body.mongoid + ' is not a valid mongo ID'
        }

        Person.findByIdAndRemove(req.body.mongoid, function (err, person) {

            if (err) {
                ui.data[ui.menuitem].status = '500'
                ui.data[ui.menuitem].data = err
            } else {
                if (person == null) {
                    ui.data[ui.menuitem].status = '404'
                    ui.data[ui.menuitem].data = 'person id ' + req.body.mongoid + ' not found'
                } else {
                    ui.data[ui.menuitem].status = '200'
                    ui.data[ui.menuitem].data = person
                }
            }

            ui.data[ui.menuitem].action = 'update'
            res.render('./index.ejs', {
                ui: ui
            })

        })
    })
}