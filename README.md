![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Oracle Database Sails/Waterline Adapter

A [Waterline](https://github.com/balderdashy/waterline) adapter for Oracle Database that uses the Official Node Oracle Driver (v1.3.0) mantained by Oracle Corp.  It may be used in [Sails](https://github.com/balderdashy/sails) web applications or any another Node.js project using Waterline as ORM.

## What can be done?

`sails-oracle-database` is an ORM adapter for `waterline` that works on both Windows and Linux systems. 

- Allows to perform CRUD (Create/Read/Update/Delete) operations using model IDs.
- Can run custom queries with the adapter's `.query()` method.
- Compatible with Sails' `migration: alter` mode. More information at [Sails.js documentation](http://sailsjs.com/documentation/concepts/models-and-orm/model-settings).

Some features we are still working on:

- Allow to select a primary key different from `id` with `autoPK: true`.
- Perform update requests without having to use `id` inside the `where` clause.
- Provide a `.count()` method to retrieve the total number of objects inside a model.
- On `migrate: alter` mode, implement the creation of triggers and sequences for autoincremental attributes. It has to be manually created yet.
- On `migrate: alter` mode, automatically allow the individual addition and deletion of table columns.
- On `migrate: alter` mode, implement a `.createEach()` method.
- Suport to native joins.

## How to install

`oracledb` driver module is the main dependency of `sails-oradb`, so before installing it, you MUST read [How to Install oracledb](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md).

Installation is performed via NPM as follows:

```bash
$ npm install sails-oracle-database
```

## Configuration parameters

The following configuration options are available along with their default values:

```javascript
config: {
    adapter: 'sails-oradb',
    connectString: 'host:port/databaseName',
    logQueries:true,
    dateFormat: 'dd-mm-yyyy hh24:mi:ss' //default
    debug:true,
    user: 'user',
    password: 'password'
};
```

## About Waterline

Waterline is a new kind of storage and retrieval engine. It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

To learn more visit the project on GitHub at [Waterline](https://github.com/balderdashy/waterline).
