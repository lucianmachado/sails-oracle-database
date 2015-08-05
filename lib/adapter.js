/**
 * Module Dependencies
 */
var oracledb = require('oracledb');
var _ = require('lodash');
//var url = require('url');
var async = require('async');
var Errors = require('waterline-errors').adapter;
var Sequel = require('waterline-sequel');
var utils = require('./utils');
var Processor = require('./processor');
var Cursor = require('waterline-cursor');
//var moment = require('moment');
var hop = utils.object.hasOwnProperty;


/**
 * waterline-sails-oradb
 */
module.exports = (function () {


    var sqlOptions = {
        parameterized: true,
        caseSensitive: true,
        escapeCharacter: '"',
        casting: true,
        canReturnValues: true,
        escapeInserts: true,
        declareDeleteAlias: false
    };

    // Connection specific overrides from config
    var connectionOverrides = {};
    //END: Nuevo, añadido de PostgreSQL

    // You'll want to maintain a reference to each connection
    // that gets registered with this adapter.
    var connections = {};

    var pool;


    var adapter = {
        //
        // IMPORTANT:
        // `migrate` is not a production data migration solution!
        // In production, always use `migrate: safe`
        //
        // drop   => Drop schema and data, then recreate it
        // alter  => Drop/add columns as necessary.
        // safe   => Don't change anything (good for production DBs)
        //

        identity: 'sails-oradb',
        // Which type of primary key is used by default
        pkFormat: 'integer',
        syncable: true,
        // Default configuration for connections
        defaults: {
            /*host: 'localhost',
             port: 1521,*/
            schema: true,
            ssl: false

                    // port: 3306,
                    // host: 'localhost',
                    // schema: true,
                    // ssl: false,
                    // customThings: ['eh']
        },
        /** OK
         *
         * This method runs when a model is initially registered
         * at server-start-time.  This is the only required method.
         *
         * @param  {[type]}   connection [description]
         * @param  {[type]}   collection [description]
         * @param  {Function} cb         [description]
         * @return {[type]}              [description]
         */
        registerConnection: function (connection, collections, cb) {
            sails.log.info("BEGIN registerConnection");
            //sails.log.info('registerConnection');
            //BEGIN METODO POR DEFECTO
            if (!connection.identity)
                return cb(new Error('Connection is missing an identity.'));
            if (connections[connection.identity])
                return cb(new Error('Connection is already registered.'));
            //END MÉTODO POR DEFECTO

            var self = this;

            // Store any connection overrides
            connectionOverrides[connection.identity] = {};

            // Look for the WL Next key
            if (hop(connection, 'wlNext')) {
                connectionOverrides[connection.identity].wlNext = _.cloneDeep(connection.wlNext);
            }

            // Build up a schema for this connection that can be used throughout the adapter
            var schema = {};

            _.each(_.keys(collections), function (coll) {
                var collection = collections[coll];
                if (!collection)
                    return;

                var _schema = collection.waterline && collection.waterline.schema && collection.waterline.schema[collection.identity];
                if (!_schema)
                    return;

                // Set defaults to ensure values are set
                if (!_schema.attributes)
                    _schema.attributes = {};
                if (!_schema.tableName)
                    _schema.tableName = coll;

                // If the connection names are't the same we don't need it in the schema
                if (!_.includes(collections[coll].connection, connection.identity)) {
                    return;
                }

                // If the tableName is different from the identity, store the tableName in the schema
                var schemaKey = coll;
                if (_schema.tableName != coll) {
                    schemaKey = _schema.tableName;
                }

                schema[schemaKey] = _schema;
            });

            //sails.log.info(connectionObject.config);
            connection.poolMax = 20; // maximum size of the pool
            connection.poolMin = 0, // let the pool shrink completely
            connection.poolIncrement = 1, // only grow the pool by one connection at a time
            connection.poolTimeout = 300  // never terminate idle connections
            // Store the connection
            connections[connection.identity] = {
                config: connection,
                collections: collections,
                schema: schema
            };

            // Create pool
            oracledb.createPool(connection,
                    function (err, p) {
                        if (err) {
                            return handleQueryError(err, 'registerConnection');
                        }

                        pool = p;

                        // Always call describe
                        async.map(Object.keys(collections), function (colName, cb) {
                            self.describe(connection.identity, colName, cb);
                        }, cb);
                    });




        },
        /** OK
         * Fired when a model is unregistered, typically when the server
         * is killed. Useful for tearing-down remaining open connections,
         * etc.
         *
         * @param  {Function} cb [description]
         * @return {[type]}      [description]
         */
        // Teardown a Connection OK
        teardown: function (conn, cb) {
            sails.log.info("BEGIN tearDown");
            if (typeof conn == 'function') {
                cb = conn;
                conn = null;
            }
            if (!conn) {
                connections = {};
                return cb();
            }
            if (!connections[conn])
                return cb();
            delete connections[conn];
            cb();
        },
        // Raw Query Interface OK
        query: function (connectionName, table, query, data, cb) {
            sails.log.info("BEGIN query");
            if (_.isFunction(data)) {
                cb = data;
                data = null;
            }
            
            // Run query
            if (!data)
                data = {};
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            return handleQueryError(err, 'query');;
                        }

                        connection.execute(query, data, {outFormat: oracledb.OBJECT}, function (err, result) {
                            /* Release the connection back to the connection pool */
                            doRelease(connection);
                            return cb(err, result);
                        });
                    });
        },
        // Return attributes
        describe: function (connectionName, table, cb) {
            sails.log.info("BEGIN describe");
            //sails.log.info(connectionName + ' ' + table);

            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            if (!collection) {
                return cb(util.format('Unknown collection `%s` in connection `%s`', collectionName, connectionName));
            }

            var queries = [];
            queries[0] = "SELECT COLUMN_NAME, DATA_TYPE, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = '" + table + "'";
            queries[1] = "SELECT index_name,COLUMN_NAME FROM user_ind_columns WHERE table_name = '" + table + "'";
            queries[2] = "SELECT cols.table_name, cols.column_name, cols.position, cons.status, cons.owner "
                    + "FROM all_constraints cons, all_cons_columns cols WHERE cols.table_name = '" + table
                    + "' AND cons.constraint_type = 'P' AND cons.constraint_name = cols.constraint_name AND cons.owner = cols.owner "
                    + "ORDER BY cols.table_name, cols.position";

            
            //sails.log.error(pool);
            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'describe');
                            return;
                        }

                        connection.execute(queries[0], {}, {outFormat: oracledb.OBJECT}, function __SCHEMA__(err, result) {

                            //sails.log.error(result);
                            if (err) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                return cb(handleQueryError(err, 'describe'));
                            }

                            var schema = result.rows;

                            connection.execute(queries[1], {}, {outFormat: oracledb.OBJECT}, function __DEFINE__(err, result) {

                                if (err) {
                                    /* Release the connection back to the connection pool */
                                    doRelease(connection);
                                    return cb(handleQueryError(err, 'describe'));
                                }

                                var indexes = result.rows;


                                connection.execute(queries[2], {}, {outFormat: oracledb.OBJECT}, function __DEFINE__(err, result) {

                                    if (err) {
                                        /* Release the connection back to the connection pool */
                                        doRelease(connection);
                                        return cb(handleQueryError(err, 'describe'));
                                    }

                                    var tablePrimaryKeys = result.rows;
                                    if (schema.length === 0) {
                                        return cb();
                                    }

                                    // Loop through Schema and attach extra attributes
                                    schema.forEach(function (attribute) {
                                        tablePrimaryKeys.forEach(function (pk) {
                                            // Set Primary Key Attribute
                                            if (attribute.COLUMN_NAME === pk.COLUMN_NAME) {
                                                attribute.primaryKey = true;
                                                // If also a number set auto increment attribute
                                                if (attribute.DATA_TYPE === 'NUMBER') {
                                                    attribute.autoIncrement = true;
                                                }
                                            }
                                        });
                                        // Set Unique Attribute
                                        if (attribute.NULLABLE === 'N') {
                                            attribute.required = true;
                                        }

                                    });
                                    // Loop Through Indexes and Add Properties
                                    indexes.forEach(function (index) {
                                        schema.forEach(function (attribute) {
                                            if (attribute.COLUMN_NAME === index.COLUMN_NAME)
                                            {
                                                attribute.indexed = true;
                                            }
                                        });
                                    });
                                    // Convert mysql format to standard javascript object

                                    //var normalizedSchema = sql.normalizeSchema(schema, collection.attributes);
                                    // Set Internal Schema Mapping
                                    //collection.schema = normalizedSchema;

                                    /* Release the connection back to the connection pool */
                                    doRelease(connection);
                                    // TODO: check that what was returned actually matches the cache
                                    cb(null, schema);

                                });

                            });

                        });
                    });

        },
        /**
         *
         * REQUIRED method if integrating with a schemaful
         * (SQL-ish) database.
         *
         */
        define: function (connection, collection, definition, cb) {
            sails.log.info('BEGIN define')
            // Add in logic here to create a collection (e.g. CREATE TABLE logic)
            var describe = function (err, result) {
                if (err)
                    return cb(err);

                // Describe (sets schema)
                adapter.describe(connectionName, table.replace(/["']/g, ""), cb);
            };

            // Escape Table Name
            table = utils.escapeName(table);

            // Iterate through each attribute, building a query string
            var _schema = utils.buildSchema(definition);

            // Check for any Index attributes
            var indexes = utils.buildIndexes(definition);

            // Build Query
            var query = 'CREATE TABLE ' + table + ' (' + _schema + ')';

            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'define');
                            return;
                        }

                        connection.execute(query, {}, {outFormat: oracledb.OBJECT}, function __DEFINE__(err, result) {
                            /* Release the connection back to the connection pool */
                            doRelease(connection);
                            if (err) {

                                return cb(handleQueryError(err, 'define'));
                            }

                            // Build Indexes
                            function buildIndex(name, cb) {

                                // Strip slashes from table name, used to namespace index
                                var cleanTable = table.replace(/['"]/g, '');

                                // Build a query to create a namespaced index tableName_key
                                var query = 'CREATE INDEX ' + utils.escapeName(cleanTable + '_' + name) + ' on ' + table + ' (' + utils.escapeName(name) + ');';

                                // Run Query
                                connection.execute(query, {}, function (err, result) {
                                    doRelease(connection);
                                    if (err)
                                        return cb(handleQueryError(err, 'define'));
                                    cb();
                                });
                            }

                            // Build indexes in series
                            async.eachSeries(indexes, buildIndex, cb);

                        });
                    });
        },
        /**
         *
         * REQUIRED method if integrating with a schemaful
         * (SQL-ish) database.
         *
         */

        // Drop a table OK
        drop: function (connection, collection, relations, cb) {
            sails.log.info("BEGIN drop");
            if (typeof relations === 'function') {
                cb = relations;
                relations = [];
            }
            
            // Drop any relations
            function dropTable(item, next) {

                // Build Query
                var query = 'DROP TABLE ' + utils.escapeName(item) + ';';

                // Run Query

                pool.getConnection(
                        function (err, connection)
                        {
                            if (err) {
                                handleQueryError(err, 'drop');
                                return;
                            }

                            connection.execute(query, {}, {outFormat: oracledb.OBJECT}, function __DROP__(err, result) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                if (err)
                                    result = null;
                                next(null, result);
                            });
                        });
            }

            async.eachSeries(relations, dropTable, function (err) {
                if (err)
                    return cb(err);
                dropTable(table, cb);
            });

        },
        // Add a column to a table OK
        addAttribute: function (connectionName, table, attrName, attrDef, cb) {
            sails.log.info("BEGIN addAttribute");
            
            // Escape Table Name
            table = utils.escapeName(table);

            // Setup a Schema Definition
            var attrs = {};
            attrs[attrName] = attrDef;

            var _schema = utils.buildSchema(attrs);

            // Build Query
            var query = 'ALTER TABLE ' + table + ' ADD COLUMN ' + _schema;

            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'addAttribute');
                            return;
                        }

                        connection.execute(query, {}, {outFormat: oracledb.OBJECT}, function __ADD_ATTRIBUTE__(err, result) {
                            /* Release the connection back to the connection pool */
                            doRelease(connection);
                            if (err)
                                return cb(handleQueryError(err, 'addAttribute'));
                            cb(null, result.rows);
                        });
                    });

        },
        // Remove a column from a table OK
        removeAttribute: function (connectionName, table, attrName, cb) {
            sails.log.info("BEGIN removeAttribute");
            
            // Escape Table Name
            table = utils.escapeName(table);

            // Build Query
            var query = 'ALTER TABLE ' + table + ' DROP COLUMN "' + attrName + '" RESTRICT';

            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'removeAttribute');
                            return;
                        }

                        connection.execute(query, {}, {outFormat: oracledb.OBJECT}, function __REMOVE_ATTRIBUTE__(err, result) {
                            /* Release the connection back to the connection pool */
                            doRelease(connection);
                            if (err)
                                return cb(handleQueryError(err, 'removeAttribute'));
                            cb(null, result.rows);
                        });
                    });

        },
        /**
         *
         * REQUIRED method if users expect to call Model.find(), Model.findOne(),
         * or related.
         *
         * You should implement this method to respond with an array of instances.
         * Waterline core will take care of supporting all the other different
         * find methods/usages.
         *
         */


        // Native Join Support OK
        join: function (connectionName, table, options, cb) {
            sails.log.info("BEGIN join");
            
            // Populate associated records for each parent result
            // (or do them all at once as an optimization, if possible)
            Cursor({
                instructions: options,
                nativeJoins: true,
                /**
                 * Find some records directly (using only this adapter)
                 * from the specified collection.
                 *
                 * @param  {String}   collectionIdentity
                 * @param  {Object}   criteria
                 * @param  {Function} _cb
                 */
                $find: function (collectionName, criteria, _cb) {
                    return adapter.find(conn, collectionIdentity, criteria, _cb, pool);
                },
                /**
                 * Look up the name of the primary key field
                 * for the collection with the specified identity.
                 *
                 * @param  {String}   collectionIdentity
                 * @return {String}
                 */
                $getPK: function (collectionName) {
                    if (!collectionName)
                        return;
                    return _getPK(connectionName, collectionName);
                },
                /**
                 * Given a strategy type, build up and execute a SQL query for it.
                 *
                 * @param {}
                 */

                $populateBuffers: function populateBuffers(options, next) {

                    var buffers = options.buffers;
                    var instructions = options.instructions;

                    // Grab the collection by looking into the connection
                    var connectionObject = connections[connectionName];
                    var collection = connectionObject.collections[table];

                    var parentRecords = [];
                    var cachedChildren = {};

                    // Grab Connection Schema
                    var schema = {};

                    Object.keys(connectionObject.collections).forEach(function (coll) {
                        schema[coll] = connectionObject.collections[coll].schema;
                    });

                    // Build Query
                    var _schema = connectionObject.schema;

                    // Mixin WL Next connection overrides to sqlOptions
                    var overrides = connectionOverrides[connectionName] || {};
                    var _options = _.cloneDeep(sqlOptions);
                    if (hop(overrides, 'wlNext')) {
                        _options.wlNext = overrides.wlNext;
                    }

                    var sequel = new Sequel(_schema, _options);
                    var _query;

                    // Build a query for the specific query strategy
                    try {
                        _query = sequel.find(table, instructions);
                    } catch (e) {
                        return next(e);
                    }

                    async.auto({
                        processParent: function (next) {
                            // Run Query
                            pool.getConnection(
                                    function (err, connection)
                                    {
                                        if (err) {
                                            handleQueryError(err, 'join');
                                            return;
                                        }

                                        connection.execute(_query.query[0], _query.values[0], {outFormat: oracledb.OBJECT}, function __FIND__(err, result) {
                                            /* Release the connection back to the connection pool */
                                            doRelease(connection);
                                            if (err) {
                                                return cb(handleQueryError(err, 'join'));
                                            }

                                            parentRecords = result.rows;

                                            var splitChildren = function (parent, next) {
                                                var cache = {};

                                                _.keys(parent).forEach(function (key) {

                                                    // Check if we can split this on our special alias identifier '___' and if
                                                    // so put the result in the cache
                                                    var split = key.split('___');
                                                    if (split.length < 2)
                                                        return;

                                                    if (!hop(cache, split[0]))
                                                        cache[split[0]] = {};
                                                    cache[split[0]][split[1]] = parent[key];
                                                    delete parent[key];
                                                });

                                                // Combine the local cache into the cachedChildren
                                                if (_.keys(cache).length > 0) {
                                                    _.keys(cache).forEach(function (pop) {
                                                        if (!hop(cachedChildren, pop))
                                                            cachedChildren[pop] = [];
                                                        cachedChildren[pop] = cachedChildren[pop].concat(cache[pop]);
                                                    });
                                                }

                                                next();
                                            };

                                            // Pull out any aliased child records that have come from a hasFK association
                                            async.eachSeries(parentRecords, splitChildren, function (err) {
                                                if (err)
                                                    return next(err);
                                                buffers.parents = parentRecords;
                                                next();
                                            });

                                        });
                                    });
                        },
                        // Build child buffers.
                        // For each instruction, loop through the parent records and build up a
                        // buffer for the record.
                        buildChildBuffers: ['processParent', function (next, results) {
                                async.each(_.keys(instructions.instructions), function (population, nextPop) {

                                    var populationObject = instructions.instructions[population];
                                    var popInstructions = populationObject.instructions;
                                    var pk = _getPK(connectionName, popInstructions[0].parent);

                                    var alias = populationObject.strategy.strategy === 1 ? popInstructions[0].parentKey : popInstructions[0].alias;

                                    // Use eachSeries here to keep ordering
                                    async.eachSeries(parentRecords, function (parent, nextParent) {
                                        var buffer = {
                                            attrName: population,
                                            parentPK: parent[pk],
                                            pkAttr: pk,
                                            keyName: alias
                                        };

                                        var records = [];

                                        // Check for any cached parent records
                                        if (hop(cachedChildren, alias)) {
                                            cachedChildren[alias].forEach(function (cachedChild) {
                                                var childVal = popInstructions[0].childKey;
                                                var parentVal = popInstructions[0].parentKey;

                                                if (cachedChild[childVal] !== parent[parentVal]) {
                                                    return;
                                                }

                                                // If null value for the parentVal, ignore it
                                                if (parent[parentVal] === null)
                                                    return;

                                                records.push(cachedChild);
                                            });
                                        }

                                        if (records.length > 0) {
                                            buffer.records = records;
                                        }

                                        buffers.add(buffer);
                                        nextParent();
                                    }, nextPop);
                                }, next);
                            }],
                        processChildren: ['buildChildBuffers', function (next, results) {

                                // Remove the parent query
                                _query.query.shift();

                                async.each(_query.query, function (q, next) {

                                    var qs = '';
                                    var pk;

                                    if (!Array.isArray(q.instructions)) {
                                        pk = _getPK(connectionName, q.instructions.parent);
                                    }
                                    else if (q.instructions.length > 1) {
                                        pk = _getPK(connectionName, q.instructions[0].parent);
                                    }

                                    parentRecords.forEach(function (parent) {
                                        if (_.isNumber(parent[pk])) {
                                            qs += q.qs.replace('^?^', parent[pk]) + ' UNION ALL ';
                                        } else {
                                            qs += q.qs.replace('^?^', "'" + parent[pk] + "'") + ' UNION ALL ';
                                        }
                                    });

                                    // Remove the last UNION ALL
                                    qs = qs.slice(0, -11);

                                    // Add a final sort to the Union clause for integration
                                    if (parentRecords.length > 1) {
                                        qs += ' ORDER BY ';

                                        if (!Array.isArray(q.instructions)) {
                                            _.keys(q.instructions.criteria.sort).forEach(function (sortKey) {
                                                var direction = q.instructions.criteria.sort[sortKey] === 1 ? 'ASC' : 'DESC';
                                                qs += '"' + sortKey + '"' + ' ' + direction + ', ';
                                            });
                                        }
                                        else if (q.instructions.length === 2) {
                                            _.keys(q.instructions[1].criteria.sort).forEach(function (sortKey) {
                                                var direction = q.instructions[1].criteria.sort[sortKey] === 1 ? 'ASC' : 'DESC';
                                                qs += '"' + sortKey + '"' + ' ' + direction + ', ';
                                            });
                                        }

                                        // Remove the last comma
                                        qs = qs.slice(0, -2);
                                    }
                                    pool.getConnection(
                                            function (err, connection)
                                            {
                                                if (err) {
                                                    handleQueryError(err, 'join');
                                                    return;
                                                }

                                                connection.execute(qs, q.values, {outFormat: oracledb.OBJECT}, function __FIND__(err, result) {
                                                    if (err)
                                                        return next(handleQueryError(err, 'join'));

                                                    var groupedRecords = {};

                                                    result.rows.forEach(function (row) {

                                                        if (!Array.isArray(q.instructions)) {

                                                            if (!hop(groupedRecords, row[q.instructions.childKey])) {
                                                                groupedRecords[row[q.instructions.childKey]] = [];
                                                            }

                                                            groupedRecords[row[q.instructions.childKey]].push(row);
                                                        }
                                                        else {

                                                            // Grab the special "foreign key" we attach and make sure to remove it
                                                            var fk = '___' + q.instructions[0].childKey;

                                                            if (!hop(groupedRecords, row[fk])) {
                                                                groupedRecords[row[fk]] = [];
                                                            }

                                                            var data = _.cloneDeep(row);
                                                            delete data[fk];
                                                            groupedRecords[row[fk]].push(data);

                                                            // Ensure we don't have duplicates in here
                                                            groupedRecords[row[fk]] = _.uniq(groupedRecords[row[fk]], q.instructions[1].childKey);
                                                        }
                                                    });

                                                    buffers.store.forEach(function (buffer) {
                                                        if (buffer.attrName !== q.attrName)
                                                            return;
                                                        var records = groupedRecords[buffer.belongsToPKValue];
                                                        if (!records)
                                                            return;
                                                        if (!buffer.records)
                                                            buffer.records = [];
                                                        buffer.records = buffer.records.concat(records);
                                                    });

                                                    next();
                                                });
                                            });
                                }
                                , function (err) {
                                    next();
                                });

                            }]

                    },
                    function (err) {
                        if (err)
                            return next(err);
                        next();
                    });

                }

            }, done);

        },
        // Select Query Logic OK
        find: function (connectionName, table, options, cb) {
            sails.log.info('BEGIN find');
            
            // Grab Connection Schema
            var schema = {};
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            Object.keys(connectionObject.collections).forEach(function (coll) {
                schema[coll] = connectionObject.collections[coll].schema;
            });

            // Build Query
            var _schema = connectionObject.schema;
            var processor = new Processor(_schema);

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};

            var _options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                _options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(_schema, _options);
            var _query;

            //sails.log.info(sequel);
            var limit = options.limit || null;
            var skip = options.skip || null;
            delete options.skip;
            delete options.limit;
            
            
            // Build a query for the specific query strategy
            try {
                _query = sequel.find(table, options);
            } catch (e) {
                return cb(e);
            }
            
            var findQuery = _query.query[0];
            
            findQuery = findQuery.replace( /\$/g, ':');
            findQuery = findQuery.replace(" AS ", " ");
            //sails.log.info(findQuery);
            
            if (limit && skip) {
                findQuery = 'SELECT * FROM ( select a.*, ROWNUM LINE_NUMBER from (' + findQuery + ') a  where ROWNUM <= '+(skip + limit)+' ) where LINE_NUMBER  > '+limit;
            }
            else if (limit) {
                findQuery = 'SELECT * FROM ( select a.*, ROWNUM LINE_NUMBER from (' + findQuery + ') a  where ROWNUM <= '+limit+' )';
            }
            else if (skip) {
                findQuery = 'SELECT * FROM ( select a.*, ROWNUM LINE_NUMBER from (' + findQuery + ') a  where ROWNUM > ' + skip;
            }
            
            

            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            console.log(err);
                            doRelease(connection);
                            return cb(handleQueryError(err, 'find'));
                        }
                        //sails.log.info(_query.query[0].replace(" AS ", " ") );
                        //sails.log.info(_query.values[0]);
                        connection.execute(findQuery, _query.values[0], {outFormat: oracledb.OBJECT}, function __FIND__(err, result) {
                            if (err) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                return cb(handleQueryError(err, 'find'));
                            }

                            // Cast special values
                            var values = [];

                            //sails.log.error(result);
                            result.rows.forEach(function (row) {
                                
                                values.push(processor.cast(table, _.omit(row, 'LINE_NUMBER')));
                            });


                            /* Release the connection back to the connection pool */
                            doRelease(connection);

                            return cb(null, values);

                        });
                    });

            sails.log.info('END find');
        },
        // Add a new row to the table OK
        create: function (connectionName, table, data, cb) {
            sails.log.info("BEGIN create");
            
            
            var connectionObject = connections[connectionName];
            //sails.log.info(table);
            var collection = connectionObject.collections[table];
            //sails.log.info(collection);

            var schemaName = collection.meta && collection.meta.schemaName ? utils.escapeName(collection.meta.schemaName) + '.' : '';
            var tableName = schemaName + utils.escapeName(table);

            // Build up a SQL Query
            var schema = connectionObject.schema;
            var processor = new Processor(schema);

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};
            var options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(schema, options);

            var incrementSequences = [];
            var query;

            //sails.log.warn(data);
            Object.keys(schema[table].attributes).forEach(function(column) {
                
                if(schema[table].attributes[column].type === 'datetime'){
                    data[column] = new Date(data[column]);//'to_date('+moment(data[column]).format('YYYY/MM/DD HH:mm:ss')+','+formatDate+')';//moment(data[column]).format('YYYY/MM/DD HH:mm:ss');
                    sails.log.warn(data[column]);
                }
            });
            var date = date = new Date();
            
            // Build a query for the specific query strategy
            sails.log.info(data);
            try {
                query = sequel.create(table, data);
            } catch (e) {
                return cb(e);
            }

            //ToDo: Now id ALWAYS should be autoIncrement and you cannot set it manually. 
            
            query.query = query.query.replace('RETURNING *', '');
            query.query = query.query.replace( /\$/g, ':');
       
            //sails.log.info(query.query);
           
            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'create');
                            return;
                        }
                        
                        connection.execute(query.query, _.values(data), {outFormat: oracledb.OBJECT, autoCommit: true}, function __CREATE__(err, result) {
                            
                            sails.log.warn(result);
                            if (err){
                                // Release the connection back to the connection pool
                                doRelease(connection);
                                return cb(handleQueryError(err, 'create'));
                            }
                            
                            var selectQuery = 'select * from "'+table+'" order by "id" desc';
                            //sails.log.info(selectQuery);
                            connection.execute(selectQuery, [],  {maxRows:1, outFormat: oracledb.OBJECT}, function __CREATE_SELECT__(err, result){
                                
                                if (err){
                                    // Release the connection back to the connection pool
                                    doRelease(connection);
                                    return cb(handleQueryError(err, 'create_select'));
                                }
                                // Cast special values
                                var values = processor.cast(table, result.rows[0]);

                                //sails.log.info('values');
                                //sails.log.info(values);
                                
                                connection.commit(function (err){
                                    
                                    // Release the connection back to the connection pool
                                    doRelease(connection);
                                    if (err){
                                        return cb(handleQueryError(err, 'create_commit')); 
                                    }
                                    
                                    cb(null, values);
                                });
                                    
                                
                                
                                
                            });

                            
                        });
                    });

        },
        // Add a multiple rows to the table
        createEach: function (connectionName, table, records, cb) {
            sails.log.info("BEGIN createEach");
            // Don't bother if there are no records to create.
            if (records.length === 0) {
                return cb();
            }

            
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            var schemaName = collection.meta && collection.meta.schemaName ? utils.escapeName(collection.meta.schemaName) + '.' : '';
            var tableName = schemaName + utils.escapeName(table);

            // Build up a SQL Query
            var schema = connectionObject.schema;
            var processor = new Processor(schema);

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};
            var options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(schema, options);
            var incrementSequences = [];

            // Loop through all the attributes being inserted and check if a sequence was used
            Object.keys(collection.schema).forEach(function (schemaKey) {
                if (!utils.object.hasOwnProperty(collection.schema[schemaKey], 'autoIncrement'))
                    return;
                incrementSequences.push({
                    key: schemaKey,
                    value: 0
                });
            });

            // Collect Query Results
            var results = [];

            // Simple way for now, in the future make this more awesome
            async.each(records, function (data, cb) {

                var query;

                // Build a query for the specific query strategy
                try {
                    query = sequel.create(table, data);
                } catch (e) {
                    return cb(e);
                }

                // Run Query
                pool.query(query.query, query.values, function __CREATE_EACH__(err, result) {
                    if (err)
                        return cb(handleQueryError(err, 'createEach'));

                    // Cast special values
                    var values = processor.cast(table, result.rows[0]);

                    results.push(values);
                    if (incrementSequences.length === 0)
                        return cb(null, values);

                    function checkSequence(item, next) {
                        var currentValue = item.value;
                        var sequenceValue = values[item.key];

                        if (currentValue < sequenceValue) {
                            item.value = sequenceValue;
                        }
                        next();
                    }

                    async.each(incrementSequences, checkSequence, function (err) {
                        if (err)
                            return cb(err);
                        cb(null, values);
                    });
                });

            }, function (err) {
                if (err)
                    return cb(err);
                if (incrementSequences.length === 0)
                    return cb(null, results);

                function setSequence(item, next) {
                    if (sequenceValue === 0) {
                        return next();
                    }
                    var sequenceName = "'\"" + table + '_' + item.key + '_seq' + "\"'";
                    var sequenceValue = item.value;
                    var sequenceQuery = 'SELECT setval(' + sequenceName + ', ' + sequenceValue + ', true)';

                    client.query(sequenceQuery, function (err, result) {
                        if (err)
                            return next(err);
                        next();
                    });
                }

                async.each(incrementSequences, setSequence, function (err) {
                    if (err)
                        return cb(err);
                    cb(null, results);
                });
            });

        },
        // Count Query logic OK
        count: function (connectionName, table, options, cb) {
            sails.log.info("BEGIN count");
            
            // Grab Connection Schema
            var schema = {};
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            Object.keys(connectionObject.collections).forEach(function (coll) {
                schema[coll] = connectionObject.collections[coll].schema;
            });

            // Build Query
            var _schema = connectionObject.schema;
            var processor = new Processor(_schema);

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};
            var _options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                _options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(_schema, _options);
            var _query;

            // Build a query for the specific query strategy
            try {
                _query = sequel.count(table, options);
            } catch (e) {
                return cb(e);
            }


            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'count');
                            return;
                        }

                        connection.execute(_query.query[0], _query.values[0], {outFormat: oracledb.OBJECT}, function __COUNT__(err, result) {
                            if (err) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                return cb(handleQueryError(err, 'count'));
                            }

                            if (!_.isArray(result.rows) || !result.rows.length) {
                                return cb(new Error('Invalid query, no results returned.'));
                            }
                            var count = result.rows[0] && result.rows[0].count;
                            /* Release the connection back to the connection pool */
                            doRelease(connection);

                            return cb(null, Number(count));

                        });
                    });
        },
        // Stream one or more models from the collection PENDING

        // Update one or more models in the collection OK
        update: function(connectionName, table, options, data, cb) {
            sails.log.info("BEGIN update");
            //LIMIT in a oracle UPDATE command is not valid
            if (hop(options, 'limit')) {
                return cb(new Error('Your \'LIMIT ' + options.limit + '\' is not allowed in the Oracle DB UPDATE query.'));
            }
            
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            var _schema = connectionObject.schema;
            var processor = new Processor(_schema);

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};
            var _options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                _options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(_schema, _options);
            var query;

            // Build a query for the specific query strategy
            try {
                query = sequel.update(table, options, data);
            } catch (e) {
                return cb(e);
            }

            query.query = query.query.replace('RETURNING *', '');
            query.query = query.query.replace( /\$/g, ':');
            query.query = query.query.replace(" AS ", " ");
            sails.log.info(data);
            sails.log.info(options);
            
            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'update');
                            return;
                        }

                        sails.log.info(query.query);
                        sails.log.info(_.union(_.values(data), _.values(options.where)));
                        connection.execute(query.query, _.union(_.values(data), _.values(options.where)), {autoCommit: true}, function __UPDATE__(err, result) {
                            
                            if (err) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                return cb(handleQueryError(err, 'update'));
                            }

                            sails.log.info(result);
                            // Cast special values
                            var values = [];

                            //TODO: Revisar este parrafo
                            result.rows.forEach(function (row) {
                                values.push(processor.cast(table, row));
                            });

                            /* Release the connection back to the connection pool */
                            doRelease(connection);

                            cb(null, values);

                        });
                    });

        },
        // Delete one or more models from the collection OK
        destroy: function(connectionName, table, options, cb) {
            sails.log.info("BEGIN destroy");
            
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[table];

            var _schema = connectionObject.schema;

            // Mixin WL Next connection overrides to sqlOptions
            var overrides = connectionOverrides[connectionName] || {};
            var _options = _.cloneDeep(sqlOptions);
            if (hop(overrides, 'wlNext')) {
                _options.wlNext = overrides.wlNext;
            }

            var sequel = new Sequel(_schema, _options);
            var query;

            // Build a query for the specific query strategy
            try {
                query = sequel.destroy(table, options);
            } catch (e) {
                return cb(e);
            }

            query.query = query.query.replace('RETURNING *', '');
            query.query = query.query.replace( /\$/g, ':');
            query.query = query.query.replace(" AS ", " ");
            
            sails.log.info(options);
            sails.log.info(query.query);
            sails.log.info(query.values);

            // Run Query
            pool.getConnection(
                    function (err, connection)
                    {
                        if (err) {
                            handleQueryError(err, 'destroy');
                            return;
                        }

                        connection.execute(query.query, query.values, {outFormat: oracledb.OBJECT}, function __DELETE__(err, result) {
                            if (err) {
                                /* Release the connection back to the connection pool */
                                doRelease(connection);
                                return cb(handleQueryError(err, 'destroy'));
                            }

                            /* Release the connection back to the connection pool */
                            doRelease(connection);

                            cb(null, result.rows);

                        });
                    });

        }


    };

    /*************************************************************************/
    /* Private Methods
     /*************************************************************************/

    /**
     * Lookup the primary key for the given collection
     *
     * @param  {String} connectionName
     * @param  {String} collectionName
     * @return {String}
     * @api private
     */
    function _getPK(connectionName, collectionName) {

        var collectionDefinition;

        try {
            collectionDefinition = connections[connectionName].collections[collectionName].definition;
            var pk;

            pk = _.find(Object.keys(collectionDefinition), function _findPK(key) {
                var attrDef = collectionDefinition[key];
                if (attrDef && attrDef.primaryKey)
                    return key;
                else
                    return false;
            });

            if (!pk)
                pk = 'id';
            return pk;
        }
        catch (e) {
            throw new Error('Unable to determine primary key for collection `' + collectionName + '` because ' +
                    'an error was encountered acquiring the collection definition:\n' + require('util').inspect(e, false, null));
        }
    }


    /**
     *
     * @param  {[type]} err [description]
     * @return {[type]}     [description]
     * @api private
     */
    function handleQueryError(err, func) {
        //TODO: Formatear errores si procede
        sails.log.error(func);
        return err;
    }

    function doRelease(connection)
    {
        if (connection) {
            connection.release(
                    function (err) {
                        if (err) {
                            return handleQueryError(err.message);
                        }
                    });
        }
        else {
            return handleQueryError("connection not defined");
        }
        //console.log(connection);
    }
    
    //check if column or attribute is a boolean
    function fieldIsBoolean(column) {
        return (!_.isUndefined(column.type) && column.type === 'boolean');
    }

    function fieldIsDatetime(column) {
        return (!_.isUndefined(column.type) && column.type === 'datetime');
    }

    function fieldIsAutoIncrement(column) {
        return (!_.isUndefined(column.autoIncrement) && column.autoIncrement);
    }
    
    function dateField (date) {
	return 'TO_DATE(' + date + ',\'yyyy-mm-dd hh24:mi:ss\')';
    }

    // Expose adapter definition
    return adapter;

})();

