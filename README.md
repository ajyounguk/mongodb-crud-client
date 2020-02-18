## MongoDB CRUD in Node.js - Example / Demo code

## What is this?
Demo code that excercises MongoDB Create Read Update Delete (CRUD) operations with the mongoose npm module

![Alt text](/screenshots/mongo_read.png?raw=true)

## Contains
- /config = mongo connection config (sample)
- /controller = controller code with routes and DB operations in personController.js. and DB setup+purge API in setupController
- model = person DB data model
- /public = cascading stylesheet 
- /views = EJS views / HTML UI
- / = app.js main webserver code & package.json 

### Mongo Client UI Functionality:
- Add a person - CREATE Crud
- List person(s) - READ cRud
- Update person (needs MongoID from list function) - UPDATE crUd
- Delete person (needs MongoID from list function) - DELETE cruD

### Setup API
purge mongo collection = point browser at http://0.0.0.0:3000/person/purge
setup / seed data in collection = http://0.0.0.0:3000/person/setup


## Installation overview

### Install mongo DB with auth model
See https://docs.mongodb.com/manual/installation/


### Clone Repo an install module dependencies
```
git clone https://github.com/ajyounguk/mongodb-crud-demo
cd mongodb-crud-demo
npm install
```

### Mongo Config
Copy /config/mongo-config-sample.json to mongo-config.json
Needs mongo username and password and mongo running with --auth
```
cp config-sample.json config.json
```


## How to run it
```
node app.js
```

point your browser at the lport 3000 to load Client
http://0.0.0.0:3000


## DB user credentials example
This is **NOT** a hardened/strong security model for mongo, but a simple set of reference creds to get you started:


1. Start mongo with no auth model:
```
mongod
```

2. 
Connect to mongo cli:
```
mongo
```

3. Create database admin user in mongo cli:
```
use admin
db.createUser(
  {
    user: "admin",
    pwd: "mypassword",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
```

4. Restart db with authentication model on:
```
mongod -- auth
```

5. Connect to mongo cli and login with admin user:
```
mongo

use admin
db.auth("admin", "mypassword" )
```

6. Create new database (data) and database users 
*PS: if databse does not exist already, it's created*

```
Use data
db.createUser(
  {
    user: "data_dev",
    pwd: "devpassword",
    roles: [
       { role: "readWrite", db: "data" }
    ]
  }
)
db.createUser(
  {
    user: "data_admin",
    pwd: "adminpassword",
    roles: [
       { role: "dbOwner", db: "data" }
    ]
  }
)
```


7. Create (person) collection in (data) databse
```
{
	Create : "person"
}
```

8. Update the mongo connection configuration file (/config/mongo-config.json). Using the example dev database user above the config file would look like:
```
{
    "mongourl": "mongodb://data_dev:devpassword@127.0.0.1:27017/data"
}
```


## More Info
For more information on MongoDB:
https://www.mongodb.com/what-is-mongodb

For more information on Express:
https://www.npmjs.com/package/express

For more information on Mongoose:
https://www.npmjs.com/package/mongoose



### EOF Readme.