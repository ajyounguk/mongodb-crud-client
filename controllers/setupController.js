var Person = require('../models/personModel')

module.exports = function (app, mongoose) {

    // seed database
    app.get('/person/setup', function (req, res) {

    
        var seedPeople = [{
                firstname: 'Andrew',
                surname: 'Young',
                telephone: '0873666333',
            },
            {
                firstname: 'Maria',
                surname: 'Lucia',
                telephone: '4244234234',
            },
            {
                firstname: 'Jon',
                surname: 'Osmond',
                telephone: '0873666333',
            },
            {
                firstname: 'Lucy',
                surname: 'Carter',
                telephone: '0873666333',
            },
            {
                firstname: 'Daniel',
                surname: 'Jones',
                telephone: '0873666333',
            },
            {
                firstname: 'Rachel',
                surname: 'Fuligula',
                telephone: '0873666333',
            },
            {
                firstname: 'Tony',
                surname: 'Strider',
                telephone: '0873666333',
            },
            {
                firstname: 'Marcus',
                surname: 'Smith',
                telephone: '0873666333',
            },
            {
                firstname: 'Penelope',
                surname: 'Baker',
                telephone: '0873666333',
            },

        ]

        Person.create(seedPeople, function (err, data) {
            if (err) {
                res.send(err)
            } else {
                res.send(data)
            }

        })
    })


    // purget people collection
    app.get('/person/purge', function (req, res) {

        mongoose.connection.db.dropCollection('people', function(err, data) {

            if (err) {
                res.send(err)
            } else {
                res.send(data)
            }
        })

    })


}