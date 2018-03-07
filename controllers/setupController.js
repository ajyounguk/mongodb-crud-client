var Person = require('../models/personModel')

module.exports = function(app) {

    app.get('/person/setup', function (req, res) {

        // seed database
        var seedPeople = [
            {
                firstnmae : 'Andrew',
                surname: 'Young',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Maria',
                surname: 'Lucia',
                telephone: '4244234234',
            },
            {
                firstnmae : 'Jon',
                surname: 'Osmond',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Lucy',
                surname: 'Carter',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Daniel',
                surname: 'Jones',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Rachel',
                surname: 'Fuligula',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Tony',
                surname: 'Strider',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Marcus',
                surname: 'Smith',
                telephone: '0873666333',
            },
            {
                firstnmae : 'Penelope',
                surname: 'Baker',
                telephone: '0873666333',
            },

        ]        

        Person.create(seedPeople, function(err, results) {
            if (err) { 
                res.send(err)
            } else {
                res.send(results)
            }
            
        })
    })
}
