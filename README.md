![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Oracle Database Sails/Waterline Adapter

A [Waterline](https://github.com/balderdashy/waterline) adapter for Oracle Database that uses the Official Node Oracle Driver (v1.3.0) mantained by Oracle Corp.  It may be used in [Sails](https://github.com/balderdashy/sails) web applications or any another Node.js project using Waterline as ORM.

## How to install

`oracledb` driver module is the main dependency of `sails-oracle-database`, so before installing it, you MUST read [How to Install oracledb](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md).

Installation is performed via NPM as follows:

```bash
$ npm install sails-oracle-database
```

## Configuration parameters

The following configuration options are available along with their default values:

```javascript
config: {
    adapter: 'sails-oracle-database',
    connectString: 'host:port/databaseName',
    logQueries:true,
    debug:true,
    user: 'user',
    password: 'password'
};
```

## About Waterline

Waterline is a new kind of storage and retrieval engine. It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

To learn more visit the project on GitHub at [Waterline](https://github.com/balderdashy/waterline).
