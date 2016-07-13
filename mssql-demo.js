
// require the module so it can be used in your node JS code.

var sql = require('node-sqlserver-v8');
var supp = require('./demo-support');
var fs = require('fs');

/*
 This demo assumes a SQL server database is available.  Modify the connection string below
 appropriately.  Note, for testing sqllocaldb can be very useful - here a sql server
 database can be run from the command line.

 for example :-

 sqllocaldb create node
 sqllocaldb start node
 sqllocaldb info node
*/

var conn_str = "Driver={SQL Server Native Client 11.0};Server= np:\\\\.\\pipe\\LOCALDB#E9B74E99\\tsql\\query;Database={scratch};Trusted_Connection=Yes;";

var support = new supp.DemoSupport(sql, conn_str);
var async = new support.Async();

var demos = [
    // open connection, simple query and close.
    connection,
    // prepared statements to repeat execute SQL with different params.
    preparedStatements,
    // use the table manager to bind to a table and interact with it.
    table,
    // create and execute a stored procedure using pm.
    procedure
];

async.series(demos, function() {
    console.log("demo has finished.")
});

function procedure(done) {

    var async = new support.Async();
    var assert = new support.Assert();
    var conn = null;

    var sp_name = "test_sp_get_int_int";
    var def = "alter PROCEDURE <name>"+
        "(\n" +
        "@num1 INT,\n" +
        "@num2 INT,\n" +
        "@num3 INT OUTPUT\n" +
        "\n)" +
        "AS\n" +
        "BEGIN\n" +
        "   SET @num3 = @num1 + @num2\n"+
        "   RETURN 99;\n"+
        "END\n";

    var fns = [

        function(async_done) {
            console.log("procedure begins ...... ");
            async_done();
        },

        function(async_done) {
            console.log("opening a connection ....");
            sql.open(conn_str, function (err, new_conn) {
                assert.ifError(err);
                conn = new_conn;
                assert.check(conn != null, "connection from open is null.");
                console.log("... open");
                async_done();
            });
        },

        function (async_done) {
            def = def.replace(/<name>/g, sp_name);
            console.log("create a procedure " + sp_name);
            console.log(def);
            var ph = new support.ProcedureHelper();
            ph.createProcedure(sp_name, def, function() {
                async_done();
            })
        },
        
        function(async_done) {
            var pm = conn.procedureMgr();
            pm.callproc(sp_name, [10, 5], function(err, results, output) {
                assert.ifError(err);
                var expected = [99, 15];
                assert.check(expected[0] == output[0], "results didn't match");
                assert.check(expected[1] == output[1], "results didn't match");
                async_done();
            });
        },

        function (async_done) {
            console.log("close connection.");
            conn.close(function () {
                async_done();
            });
        },

        function(async_done) {
            console.log("...... procedure ends.");
            async_done();
        }
    ];

    console.log("executing async set of functions .....");
    async.series(fns, function() {
        console.log("..... async completes. \n\n\n\n\n\n");
        done();
    })
}

function connection(done) {

    var async = new support.Async();
    var assert = new support.Assert();
    var conn = null;

    var fns = [

        function(async_done) {
            console.log("connection begins ...... ");
            async_done();
        },

        function(async_done) {
            console.log("opening a connection ....");
            sql.open(conn_str, function (err, new_conn) {
                assert.ifError(err);
                conn = new_conn;
                assert.check(conn != null, "connection from open is null.");
                console.log("... open");
                async_done();
            });
        },

        function(async_done) {
            console.log("fetch spid for the connection.");
            conn.query("select @@SPID as id, CURRENT_USER as name", function (err, res) {
                assert.ifError(err);
                assert.check(res.length == 1, "unexpected result length.");
                var sp = res[0]['id'];
                assert.check(sp != null, "did not find expected id.");
                async_done();
            });
        },

        function (async_done) {
            console.log("close connection.");
            conn.close(function () {
                async_done();
            });
        },

        function(async_done) {
            console.log("...... connection ends.");
            async_done();
        }
    ];

    console.log("executing async set of functions .....");
    async.series(fns, function() {
        console.log("..... async completes. \n\n\n\n\n\n");
        done();
    })
}

function preparedStatements(done) {

// create and populate table - fetch prepared statements to select and delete records for employee table.
// use the prepared statements to select and delete rows.
// free the statements and indicate this part of the demo has finished.

    var async = new support.Async();
    var assert = new support.Assert();
    var statements = null;
    var conn = null;
    var fns = [

        function(async_done) {
            console.log("preparedStatements begins ...... ");
            async_done();
        },

        function (async_done) {
            console.log("opening a connection ....");
            sql.open(conn_str, function (err, new_conn) {
                assert.ifError(err);
                conn = new_conn;
                assert.check(conn != null, "connection from open is null.");
                console.log("... open");
                async_done();
            });
        },

        function(async_done) {
            console.log("preparing a select and delete statement.");
                support.prepareEmployee(conn, function (prepared) {
                assert.check(prepared != null, "prepared statement object is null.");
                assert.check(prepared.select != null, "prepared select is null");
                assert.check(prepared.delete != null, "prepared delete is null");
                statements = prepared;
                async_done();
            });
        },

        function(async_done) {
            var id = 1;
            console.log("use prepared statement to fetch " + id);
            statements.select.preparedQuery([id], function(err, res) {
                assert.ifError(err);
                assert.check(res.length == 1);
                console.log(res[0]);
                async_done();
            })
        },

        function(async_done) {
            var id = 2;
            console.log("use prepared statement to fetch " + id);
            statements.select.preparedQuery([id], function(err, res) {
                assert.ifError(err);
                assert.check(res.length == 1);
                console.log(res[0]);
                async_done();
            })
        },

        function(async_done) {
            var id = 5;
            console.log("use prepared statement to delete " + id);
            statements.delete.preparedQuery([id], function(err) {
                assert.ifError(err);
                async_done();
            })
        },

        function(async_done) {
            console.log("check how many rows are left.");
            conn.query("select * from Employee", function(err, res) {
                assert.ifError(err);
                console.log("returned rows " + res.length);
                assert.check(res.length == 9, "one row should have been deleted.");
                async_done();
            });
        },

        function (async_done) {
            console.log("free statements");
            statements.select.free(function () {
                statements.delete.free(function () {
                    async_done();
                })
            })
        },

        function (async_done) {
            console.log("close connection.");
            conn.close(function () {
                async_done();
            });
        },

        function(async_done) {
            console.log("...... preparedStatements ends.");
            async_done();
        }
    ];

    console.log("executing async set of functions .....");
    async.series(fns, function() {
        console.log("..... async completes. \n\n\n\n\n\n");
        done();
    });
}

function table(done) {

    var async = new support.Async();
    var assert = new support.Assert();
    var helper =  new support.EmployeeHelper(sql, conn_str);
    var conn = null;
    var table_name = "Employee";
    var bm = null;
    var records = helper.getJSON();

    var fns = [

        function (async_done) {
            console.log("table begins ...... ");
            async_done();
        },

        function (async_done) {
            console.log("opening a connection ....");
            sql.open(conn_str, function (err, new_conn) {
                assert.ifError(err);
                conn = new_conn;
                assert.check(conn != null, "connection from open is null.");
                console.log("... open");
                async_done();
            });
        },

        function (async_done) {
            console.log("create an employee table.");
            helper.dropCreateTable({
                name : table_name
            }, function () {
                async_done();
            });
        },

        function (async_done) {
            var tm = conn.tableMgr();
            console.log("bind to table " + table_name);
            tm.bind(table_name, function(bulk) {
                bm = bulk;
                assert.check(bm != null, "no bulk manager returned.");
                async_done();
            })
        },

        function (async_done) {
            console.log("bulk insert records.");
            bm.insertRows(records, function() {
                async_done();
            });
        },

        function (async_done) {
            console.log("check rows have been inserted.");
            conn.query("select * from " + table_name, function(err, res) {
                assert.ifError(err);
                assert.check(res.length == records.length);
                async_done();
            });
        },

        function (async_done) {
            console.log("update a column.");
            var newDate = new Date("2015-01-01T00:00:00.000Z");
            var modifications = [];
            records.forEach(function(emp) {
                emp.ModifiedDate = newDate;
                modifications.push( {
                    BusinessEntityID : emp.BusinessEntityID,
                    ModifiedDate : newDate
                });
            });

            var updateCols = [
                {
                    name: 'ModifiedDate'
                }
            ];

            bm.setUpdateCols(updateCols);
            bm.updateRows(modifications, function() {
                async_done();
            });
        },

        // use the select signature to construct a prepared query.

        function(async_done) {
            var summary = bm.getSummary();
            console.log(summary.select_signature);
            console.log("prepare the above statement.");
            var select = summary.select_signature;
            conn.prepare(select, function(err, ps) {
                assert.ifError(err);
                ps.preparedQuery([1], function(err, res) {
                    assert.ifError(err);
                    assert.check(res.length == 1);
                    async_done();
                });
            });
        },

        function(async_done) {
            console.log("delete the records using bulk operation.");
            var keys = helper.extractKey(records, 'BusinessEntityID');
            bm.deleteRows(keys, function() {
               async_done();
            });
        },

        function (async_done) {
            console.log("check rows have been deleted.");
            conn.query("select * from " + table_name, function(err, res) {
                assert.ifError(err);
                assert.check(res.length == 0);
                async_done();
            });
        },

        function (async_done) {
            console.log("close connection.");
            conn.close(function () {
                async_done();
            });
        },

        function(async_done) {
            console.log("...... table ends.");
            async_done();
        }
    ];

    console.log("executing async set of functions .....");
    async.series(fns, function () {
        console.log("..... async completes. \n\n\n\n\n\n");
        done();
    });
}