![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Oracle Database Sails/Waterline Adapter

[![npm version](https://badge.fury.io/js/sails-oradb.svg)](http://badge.fury.io/js/sails-oradb) [![Dependency Status](https://gemnasium.com/baitic/sails-oradb.png)](https://gemnasium.com/baitic/sails-oradb)

A [Waterline](https://github.com/balderdashy/waterline) adapter for Oracle Database that uses the Official Node Oracle Driver (v1.3.0) mantained by Oracle Corp.  May be used in a [Sails](https://github.com/balderdashy/sails) app or anything using Waterline for the ORM.

## What can you do?

It has few functionalities pending for development, but the adapter works. It works on both Windows and Linux systems.

Things that you can do NOW and some important specs.:

- You can do CRUD requests: Create, Read, Update and Delete request using model IDs
- You can do custom QUERIES with "query" method
- You can use alter mode on Sails.

Pending funcionalities:

- On alter mode, create automatically triggers and sequences for autoincrementable attributes. Now you must create them manually.
- The PK column must be id.
- Now in updates you must use id on where clause.
- Count request.
- On alter mode, allow the automatic addition and deletion of table columns individually.
- On alter mode, implement createEach method.

From now, you can work with this adapter using funcionalities as described. 

We hope we can improve adapter actions as soon as posible.

## Install

oracledb driver module is a dependency, so before you install sails-oradb you MUST read [How to Install](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md) it.

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
