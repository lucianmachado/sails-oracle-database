![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Oracle Database Sails/Waterline Adapter

A [Waterline](https://github.com/balderdashy/waterline) adapter for Oracle Database. It uses the Node.JS Oracle Driver mantained by Oracle Corp.  May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

## ¡Important advice!

Adapter is not finished yet. It only has implemented a few functionalities for testing purposes. 

Things that you can do NOW:

- Connect to an Oracle database.
- Do find request.
- Populate find request (Joins).
- Create, modify and delete automatically DB tables (Alter mode).

ToDo List:

- Insert request.
- Update request.
- Delete request.
- Count request.
- More.

Notice:

- The automatic addition of new collumns for existing tables is not working properly yet.
- Autoincrement for a primary key is not implemented automatically when a table is created. You must do it manually for the moment.

Main functionalities like insert, update and delete will be done as soon as posible!

## Install

As oracledb driver module is a dependency you must read [How to Install](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md)

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