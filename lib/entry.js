/**
 * InfraNodus is a lightweight interface to graph databases.
 *
 * This open source, free software is available under MIT license.
 * It is provided as is, with no guarantees and no liabilities.
 * You are very welcome to reuse this code if you keep this notice.
 *
 * Written by Dmitry Paranyushkin | Nodus Labs and hopefully you also...
 * www.noduslabs.com | info AT noduslabs DOT com
 *
 * In some parts the code from the book "Node.js in Action" is used,
 * (c) 2014 Manning Publications Co.
 *
 */


var neo4j = require('node-neo4j');

var uuid = require('node-uuid');

var options = require('../options');
dbneo = new neo4j(options.neo4jlink);

var CypherQuery = require('./db/neo4j');
var Instruments = require('./tools/instruments.js');

var async = require('async');


module.exports = Entry;

function Entry(obj) {
    for (var key in obj) {
        this[key] = obj[key];
    }
}


Entry.prototype.save = function(fn){


    // Pass on the user parameters
    var user = {
        name: this.by_name,
        uid: this.by_uid
    };

    // Pass on the user's settings for graph scan

    var fullscan = this.fullscan;

    // Set up UID for the statement
    var uuid = require('node-uuid');
    var statement_uid = uuid.v1();

    // Pass on statement parameters
    var statement = {
        text: this.text,
        uid: statement_uid,
        timestamp: this.timestamp
    };

    // Pass on the hashtags we got from Statement with validate.js
    var hashtags = this.hashtags;

    // Pass on the contexts we got from Statement with validate.js
    var contexts = this.contexts;

    // Pass on the mentions
    var mentions = this.mentions;

    // Check user's settings and see if they want to do a full scan

    var gapscan = null;

    if (fullscan == '1') { gapscan = 1 }


    // Finally, execute the query using the new contexts

    // TODO make another subfunction of CypherQuery which constructs a transation

    CypherQuery.addStatement(user, hashtags, statement, contexts, mentions, gapscan, function(cypherRequest) {

        console.log(cypherRequest);

        // Make the query itself

        dbneo.cypherQuery(cypherRequest, function(err, cypherAnswer){

            // Important: this returns an error instead of crashing the server

            if(err) {
                err.type = 'neo4j';
                return fn(err);
            }

            fn(null,JSON.stringify(cypherAnswer));


        });
    });

}


// Branch by Abstraction — saving a dummy function for multiple requests not to distrub the main ones
// TODO merge with Entry.prototype.save

Entry.prototype.savetrans = function(fn){

    // Pass on the user parameters
    var user = {
        name: this.by_name,
        uid: this.by_uid
    };

    // Pass on the user's settings for graph scan

    var fullscan = this.fullscan;

    // Set up UID for the statement
    var uuid = require('node-uuid');
    var statement_uid = uuid.v1();

    // Pass on statement parameters
    var statement = {
        text: this.text,
        uid: statement_uid,
        timestamp: this.timestamp
    };

    // Pass on the hashtags we got from Statement with validate.js
    var hashtags = this.hashtags;

    // Pass on the contexts we got from Statement with validate.js
    var contexts = this.contexts;

    // Pass on the mentions
    var mentions = this.mentions;

    // Check user's settings and see if they want to do a full scan

    var gapscan = null;

    if (fullscan == '1') { gapscan = 1 }


    // Finally, execute the query using the new contexts

    // TODO make another subfunction of CypherQuery which constructs a transation

    CypherQuery.addStatement(user, hashtags, statement, contexts, mentions, gapscan, function(cypherRequest) {

        fn(cypherRequest);


    });

}

// TODO add a parameter in getRange which would tell the function what information to query

Entry.getRange = function(receiver, perceiver, contexts, fn){

     // Start building the context query

     var context_query1 = '';
     var context_query2 = '';

     // Are the contexts passed? If yes, add contextual query

     if (contexts.length > 0 && contexts[0]) {

         context_query1 = '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), ';
         context_query2 = 'WHERE (ctx.name="' + contexts[0] + '"';

         for (var u=1;u<(contexts.length);++u) {
            context_query2 += ' OR ctx.name="' + contexts[u] + '"';
         }

         context_query2 += ') ';
     }

     // Now who sees what?

    // Perceiver - the one who made the graph
    // Receiver - the one who's watching it

     if (((receiver == perceiver) && (receiver !== '')) || ((receiver !== '') && (perceiver === ''))) {

         console.log("Getting statements from Neo4J to show to User UID: " + receiver);
         console.log("Getting statements from Neo4J made by User UID: " + perceiver);


         var rangeQuery =  "MATCH (u:User{uid:'" + receiver + "'}), " +
                           "(s:Statement), " +
                           context_query1 +
                           "(s)-[:BY]->(u) " +
                           context_query2 +
                           "RETURN DISTINCT s " +
                           "ORDER BY s.timestamp ASC;"

         console.log(rangeQuery);

     }

     // We retrieve statements to somebody who did not make them

     else if (receiver != perceiver) {

         console.log("The one who made the statements is not the same who sees them, User UID: " + receiver);
         console.log("Getting from Neo4J statements made by User UID: " + perceiver);

         // The person who's viewing the stuff is not the one who made them, so we include nodes that belong to the private context here


         if (context_query2.length == 0) {
             context_query1 = '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), ';
             context_query2 = "WHERE ";
         }
         else {
             context_query2 += " AND ";
         }

         var rangeQuery =  "MATCH (u:User{uid:'" + perceiver + "'}), " +
                           "(s:Statement), " +
                           context_query1 +
                           "(s)-[:BY]->(u) " +
                           context_query2 +
                           "ctx.public = '1'" +
                           "RETURN DISTINCT s " +
                           "ORDER BY s.timestamp ASC;"

         console.log(rangeQuery);
     }

     // Strange situation - we don't know who to show statements for
     else {
         var rangeQuery = '';
     }


     dbneo.cypherQuery(rangeQuery, function(err, statements){

            if(err) {
                err.type = 'neo4j';
                return fn(err);
             }

            // debug to see what info about the statements is shown
            // console.log(statements);

            fn(null,statements.data);

     });


};


Entry.getNodes = function(receiver, perceiver, contexts, fullview, showcontexts, res, req, fn){

    var context_query = "";
    var view_filter = "";
    var show_contexts = "";

    // Are the contexts passed? If yes, change relation query to query specific contexts

    if (contexts.length > 0 && contexts[0]) {

        context_query = 'AND (ctx.name="' + contexts[0] + '" ';
        for (var u = 1; u < (contexts.length); ++u) {
            context_query += 'OR ctx.name="' + contexts[u] + '" ';
        }

        context_query += ') ';

    }


    // Show graph with all types of connections or only the words that are next to each other?

    if (fullview == null) {
        view_filter = "WHERE (rel.gapscan='2' OR rel.gapscan IS NULL)  ";
    }

    // Who sees what?


    if (((receiver == perceiver) && (receiver !== '')) || ((receiver !== '') && (perceiver === ''))) {

        console.log("Retrieving nodes for User UID: " + receiver);
        console.log("Retrieving nodes made by UID: " + perceiver);

        // Do we show the contexts?

        if (showcontexts) {
             show_contexts =        "UNION CALL apoc.index.relationships('AT','user:" + receiver + "') " +
                                    "YIELD rel, start, end " + view_filter +
                                    "WITH DISTINCT rel, start, end MATCH (ctx:Context) " +
                                    "WHERE rel.context = ctx.uid " + context_query +
                                    "RETURN DISTINCT start.uid AS source_id, start.name AS source_name, " +
                                    "end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, " +
                                    "ctx.name AS context_name, rel.statement AS statement_id, rel.weight AS weight;";
        }


   /* var querynodes =    "MATCH " +
                        "(c1:Concept), (c2:Concept), " +
                        context_query1 +
                        "c1-[rel:TO]->c2 " +
                        "WHERE " +
                        view_filter +
                        context_query2 +
                        "(rel.user='" + receiver + "' AND " +
                        "ctx.uid = rel.context) " +
                        "WITH DISTINCT " +
                        "c1, c2 " +
                        "MATCH " +
                        "(ctxname:Context), " +
                        "c1-[relall:TO]->c2 " +
                        "WHERE " +
                        "(relall.user='" + receiver + "' AND " +
                        "ctxname.uid = relall.context) " +
                        "RETURN DISTINCT " +
                        "c1.uid AS source_id, " +
                        "c1.name AS source_name, " +
                        "c2.uid AS target_id, " +
                        "c2.name AS target_name, " +
                        "relall.uid AS edge_id, " +
                        "ctxname.name AS context_name, " +
                        "relall.statement AS statement_id, " +
                        "relall.weight AS weight;";*/

        var querynodes =   "CALL apoc.index.relationships('TO','user:" + receiver + "') " +
                           "YIELD rel, start, end " + view_filter +
                           "WITH DISTINCT rel, start, end MATCH (ctx:Context) " +
                           "WHERE rel.context = ctx.uid " + context_query +
                           "RETURN DISTINCT start.uid AS source_id, start.name AS source_name, " +
                           "end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, " +
                           "ctx.name AS context_name, rel.statement AS statement_id, rel.weight AS weight " + show_contexts;

        console.log(querynodes);
    }

    else if ((receiver != perceiver) && (perceiver !== '')) {

        console.log("1 Retrieving nodes for User UID: " + receiver);
        console.log("Retrieving nodes made by UID: " + perceiver);

        // TODO fix show_contexts — searching through AT relationships (now not added in query)

        if (showcontexts) {
             show_contexts =   "UNION CALL apoc.index.relationships('TO','user:" + perceiver + "') " +
                               "YIELD rel, start, end " + view_filter +
                               "WITH DISTINCT rel, start, end MATCH (ctx:Context) " +
                               "WHERE rel.context = ctx.uid AND ctx.public = '1' " + context_query +
                               "RETURN DISTINCT start.uid AS source_id, start.name AS source_name, " +
                               "end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, " +
                               "ctx.name AS context_name, rel.statement AS statement_id, rel.weight AS weight;";
        }

        var querynodes =  "CALL apoc.index.relationships('TO','user:" + perceiver + "') " +
                          "YIELD rel, start, end " + view_filter +
                          "WITH DISTINCT rel, start, end MATCH (ctx:Context) " +
                          "WHERE rel.context = ctx.uid AND ctx.public = '1' " + context_query +
                          "RETURN DISTINCT start.uid AS source_id, start.name AS source_name, " +
                          "end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, " +
                          "ctx.name AS context_name, rel.statement AS statement_id, rel.weight AS weight " + show_contexts;

        console.log(querynodes);
    }



        dbneo.cypherQuery(querynodes, function(err, nodes){

        if(err) {
            err.type = 'neo4j';
            return fn(err);
        }

        var nodes_object = nodes.data;


        var g = {
            nodes: [],
            edges: []
        };

        // Custom stopwords for this graph
        // TODO CODE REPEAT from validate.js — export it into a separate function

        var stopwords_custom = '';
        if (!res.locals.user.stopwords) {
            stopwords_custom = '';
        }
        else {
            stopwords_custom = res.locals.user.stopwords;
        }

        var stopwords_add = stopwords_custom.split(/[\s,;\t\n]+/);

        for (var i = 0; i<stopwords_add.length; i++) {
          if (stopwords_add[i].charAt(0) == '-') {
            stopwords_add[i] = '';
          }
        }


        // A new sorted array
        var sorted = [];

        // Let's reiterate through all the results
        for (var i = 0; i < nodes_object.length; i++) {

            // Set index for source and target to -1
            var indexsource = -1;
            var indextarget = -1;

            // Reiterate through the sorted array
            for (var j = 0; j < sorted.length; j++) {
                // Is there anywhere in this array the UID of the source node? Yes? We set the index to 1
                // NOTE used to be sorted[j].val = nodes_object[i][0] but in this case because of a previous DB bug if duplicate nodes with different IDs appeared they'd be added both and then sigma fails

                if (sorted[j].name == nodes_object[i][1]) indexsource = j;

            }

            // We did not find that source UID in the sorted?
            if (indexsource == -1) {
                if (stopwords_add.indexOf(nodes_object[i][1]) == -1) {
                  sorted.push({val: nodes_object[i][0], name: nodes_object[i][1], count: 1});
                }
            }
            // We found it? Then add more to the count
            else {
                if (sorted[indexsource].val == nodes_object[i][0]) {
                  sorted[indexsource].count++;
                }
            }

          // Reiterate through the sorted array again
            for (var j = 0; j < sorted.length; j++) {
                // Is there anywhere in this array the UID of the target node? Yes? Set the index to 1
                // NOTE used ot be sorted[j].val = nodes_object[i][2]
                if (sorted[j].name == nodes_object[i][3]) indextarget = j;

            }


            if (indextarget == -1 ) {
                if (stopwords_add.indexOf(nodes_object[i][3]) == -1) {
                  sorted.push({val: nodes_object[i][2], name: nodes_object[i][3], count: 1});
                }
            }
            else {
                if (sorted[indextarget].val == nodes_object[i][2]) {
                  sorted[indextarget].count++;
                }
            }

        }

        sorted.sort(function(a,b) {
           if (a.count > b.count) return -1;
           if (a.count < b.count) return 1;
           return 0;
        });


        var maxnodes = options.settings.max_nodes;

        if (req.query.maxnodes) {

            if (isInt(req.query.maxnodes)) {
                maxnodes = req.query.maxnodes;
            }

            function isInt(value) {
                return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
            }

        }

        else if (res.locals.user) {
            if (res.locals.user.maxnodes) {
                maxnodes = res.locals.user.maxnodes;
            }
        }

        sorted = sorted.slice(0,maxnodes);


        for (var i = 0; i < nodes_object.length; i++) {

            var sourcein = null;
            var targetin = null;

            for (var j = 0; j < sorted.length; j++) {
                if (sorted[j].val == nodes_object[i][0]) {
                    sourcein = 1;
                }
                if (sorted[j].val == nodes_object[i][2]) {
                    targetin = 1;
                }
            }


            if ((sourcein) && (targetin)) {

                // If the edge has no weight, add an arbitrary 3 one
                if (!nodes_object[i][7]) {
                    nodes_object[i][7] = 3;
                }

                // If the edge doesn't have an ID it's because it's of the :AT kind and it's a context connecting to concept
                if (!nodes_object[i][4]) {
                    nodes_object[i][4] = 'context' + uuid.v1();
                }

                g.nodes.push({
                    id: nodes_object[i][0],
                    label: nodes_object[i][1]
                });

                g.nodes.push({
                    id: nodes_object[i][2],
                    label: nodes_object[i][3]
                });

                g.edges.push({
                    source: nodes_object[i][0],
                    target: nodes_object[i][2],
                    id: nodes_object[i][4],
                    edge_context: nodes_object[i][5],
                    statement_id: nodes_object[i][6],
                    weight: nodes_object[i][7]
                });

            }

        };

        // TODO fix that some statements appear twice, some are gone issue #11


        g.nodes = Instruments.uniqualizeArray(g.nodes, JSON.stringify);

        g.nodes.sort(function(a, b){
                if(a.label < b.label) return -1;
                if(a.label > b.label) return 1;
                return 0;
        });

        g.edges = Instruments.uniqualizeArray(g.edges, JSON.stringify);

        if (g.nodes.length == 0) {
            g.nodes.push({
                id: 'dummy',
                label: ''
            });
        }


        fn(null,g);

    });



};
