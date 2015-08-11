![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Oracle Database Sails/Waterline Adapter

[![npm version](https://badge.fury.io/js/sails-oradb.svg)](http://badge.fury.io/js/sails-oradb) [![Dependency Status](https://gemnasium.com/baitic/sails-oradb.png)](https://gemnasium.com/baitic/sails-oradb)

A [Waterline](https://github.com/balderdashy/waterline) adapter for Oracle Database that uses the Node Oracle Driver mantained by Oracle Corp.  May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

## ¡Important advice!

The Adapter is not finished yet. It only has implemented few functionalities for testing purposes. 

Things that you can do NOW:

- Connect to an Oracle database. (05/Aug/2015)
- Do find request. (05/Aug/2015)
- Populate find request (Joins). (07/Aug/2015)
- Create, modify and delete automatically DB tables (Alter mode). (07/Aug/2015)
- Insert request. (11/Aug/2015)

ToDo List:

- Update request.
- Delete request.
- Count request.
- Improvements:
    - On alter mode, allow the automatic addition and deletion of table columns individually.
    - On alter mode, implement createEach method.
    - On alter mode, create automatically triggers and sequences for autoincrementable attributes.
    - On insert autoincrementable attribute value, set its sequence if necessary.
    - Allow using multiple Oracle connections in application.
- More.

Notice:

- The automatic addition of new collumns for existing tables is not working properly yet.
- Autoincrement for a primary key is not implemented automatically when a table is created. You must do it manually for the moment.


Main functionalities like update and delete will be done as soon as posible!

## Install

As oracledb driver module is a dependency you must read [How to Install](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md) it.

Install is through NPM.

```bash
$ npm install sails-oradb
```

## Configuration

The following config options are available along with their default values:

```javascript
config: {
    adapter: 'sails-oradb',
    connectString: 'host:port/databaseName',
    user: 'root',
    password: ''
};
```

## About Waterline

Waterline is a new kind of storage and retrieval engine.  It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

To learn more visit the project on GitHub at [Waterline](https://github.com/balderdashy/waterline).
