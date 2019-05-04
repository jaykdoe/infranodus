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

var neo4j = require('node-neo4j')

var uuid = require('node-uuid')

var options = require('../options')
dbneo = new neo4j(options.neo4jlink)

var CypherQuery = require('./db/neo4j')
var Instruments = require('./tools/instruments.js')

var async = require('async')

var neo4jnew = require('neo4j-driver').v1

module.exports = Entry

function Entry(obj) {
    for (var key in obj) {
        this[key] = obj[key]
    }
}

// Branch by Abstraction — saving a dummy function for multiple requests not to distrub the main ones

Entry.prototype.savetrans = function(fn) {
    // Pass on the user parameters
    var user = {
        name: this.by_name,
        uid: this.by_uid,
    }

    // Pass on the user's settings for graph scan

    var fullscan = this.fullscan

    var addmentions = this.addmentions

    // Pass on statement parameters
    var statements = this.statements

    // Pass on the contexts we got from Statement with validate.js
    var contexts = this.contexts

    // Check user's settings and see if they want to do a full scan

    var gapscan = null

    if (fullscan == '1') {
        gapscan = 1
    }

    // Finally, execute the query using the new contexts

    CypherQuery.addStatement(
        user,
        statements,
        contexts,
        addmentions,
        gapscan,
        function(cypherRequest) {
            //console.log(cypherRequest);
            fn(cypherRequest)
        }
    )
}

// TODO add a parameter in getRange which would tell the function what information to query

Entry.getRange = function(receiver, perceiver, contexts, fn) {
    console.log('making request to db')

    // Start building the context query

    var context_query1 = ''
    var context_query2 = ''

    // Are the contexts passed? If yes, add contextual query

    if (contexts.length > 0 && contexts[0]) {
        context_query1 = '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), '
        context_query2 = 'WHERE (ctx.name="' + contexts[0] + '"'

        for (var u = 1; u < contexts.length; ++u) {
            context_query2 += ' OR ctx.name="' + contexts[u] + '"'
        }

        context_query2 += ') '
    }

    // Now who sees what?

    // Perceiver - the one who made the graph
    // Receiver - the one who's watching it

    if (
        (receiver == perceiver && receiver !== '') ||
        (receiver !== '' && perceiver === '')
    ) {
        console.log(
            'Getting statements from Neo4J to show to User UID: ' + receiver
        )
        console.log(
            'Getting statements from Neo4J made by User UID: ' + perceiver
        )

        var rangeQuery =
            "MATCH (u:User{uid:'" +
            receiver +
            "'}), " +
            '(s:Statement), ' +
            context_query1 +
            '(s)-[:BY]->(u) ' +
            context_query2 +
            'RETURN DISTINCT s ' +
            'ORDER BY s.timestamp ASC;'

        console.log(rangeQuery)
    }

    // We retrieve statements to somebody who did not make them
    else if (receiver != perceiver) {
        console.log(
            'The one who made the statements is not the same who sees them, User UID: ' +
                receiver
        )
        console.log(
            'Getting from Neo4J statements made by User UID: ' + perceiver
        )

        // The person who's viewing the stuff is not the one who made them, so we include nodes that belong to the private context here

        if (context_query2.length == 0) {
            context_query1 =
                '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), '
            context_query2 = 'WHERE '
        } else {
            context_query2 += ' AND '
        }

        var rangeQuery =
            "MATCH (u:User{uid:'" +
            perceiver +
            "'}), " +
            '(s:Statement), ' +
            context_query1 +
            '(s)-[:BY]->(u) ' +
            context_query2 +
            "ctx.public = '1'" +
            'RETURN DISTINCT s ' +
            'ORDER BY s.timestamp ASC;'

        console.log(rangeQuery)
    }

    // Strange situation - we don't know who to show statements for
    else {
        var rangeQuery = ''
    }

    dbneo.cypherQuery(rangeQuery, function(err, statements) {
        if (err) {
            err.type = 'neo4j'
            return fn(err)
        }

        // debug to see what info about the statements is shown
        // console.log(statements);

        fn(null, statements.data)
    })
}

Entry.getLDA = function(receiver, perceiver, contexts, LDA_type, fn) {
    // Start building the context query

    var context_query1 = ''
    var context_query2 = ''

    // Are the contexts passed? If yes, add contextual query

    if (contexts.length > 0 && contexts[0]) {
        context_query1 = '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), '
        context_query2 = 'WHERE (ctx.name="' + contexts[0] + '"'

        for (var u = 1; u < contexts.length; ++u) {
            context_query2 += ' OR ctx.name="' + contexts[u] + '"'
        }

        context_query2 += ') '
    }

    // Now who sees what?

    // Perceiver - the one who made the graph
    // Receiver - the one who's watching it

    if (
        (receiver == perceiver && receiver !== '') ||
        (receiver !== '' && perceiver === '')
    ) {
        console.log(
            'Getting statements from Neo4J to show to User UID: ' + receiver
        )
        console.log(
            'Getting statements from Neo4J made by User UID: ' + perceiver
        )

        var rangeQuery =
            "MATCH (u:User{uid:'" +
            receiver +
            "'}), " +
            '(s:Statement), ' +
            context_query1 +
            '(s)-[:BY]->(u) ' +
            context_query2 +
            'RETURN DISTINCT s ' +
            'ORDER BY s.timestamp ASC;'

        console.log(rangeQuery)
    }

    // We retrieve statements to somebody who did not make them
    else if (receiver != perceiver) {
        console.log(
            'The one who made the statements is not the same who sees them, User UID: ' +
                receiver
        )
        console.log(
            'Getting from Neo4J statements made by User UID: ' + perceiver
        )

        // The person who's viewing the stuff is not the one who made them, so we include nodes that belong to the private context here

        if (context_query2.length == 0) {
            context_query1 =
                '(ctx:Context), (ctx)-[:BY]->(u), (s)-[:IN]->(ctx), '
            context_query2 = 'WHERE '
        } else {
            context_query2 += ' AND '
        }

        var rangeQuery =
            "MATCH (u:User{uid:'" +
            perceiver +
            "'}), " +
            '(s:Statement), ' +
            context_query1 +
            '(s)-[:BY]->(u) ' +
            context_query2 +
            "ctx.public = '1'" +
            'RETURN DISTINCT s ' +
            'ORDER BY s.timestamp ASC;'

        console.log(rangeQuery)
    }

    // Strange situation - we don't know who to show statements for
    else {
        var rangeQuery = ''
    }

    dbneo.cypherQuery(rangeQuery, function(err, statements) {
        if (err) {
            err.type = 'neo4j'
            return fn(err)
        }

        var lda = require('lda')

        var natural = require('natural')
        var nounInflector = new natural.NounInflector()

        var documents = []
        var full_content = ''
        for (var i = 0; i < statements.data.length; i++) {
            documents.push(statements.data[i].text)
            full_content += statements.data[i].text + ' '
        }
        // TURN this on in case need to use sentences
        // documents = full_content.match( /[^\.!\?]+[\.!\?]+/g );

        // Extract sentences.
        // Run LDA to get terms for 2 topics (5 terms each).

        if (LDA_type == 'topics') {
            var result = lda(documents, 4, 3, null, null, null, 123)
        } else if (LDA_type == 'terms') {
            var result = lda(documents, 1, 4, null, null, null, 123)
        } else {
            var result = lda(documents, 4, 3, null, null, null, 123)
        }

        for (var i = 0; i < result.length; i++) {
            for (var j = 0; j < result[i].length; j++) {
                if (result[i][j].term != 'people') {
                    result[i][j].term = nounInflector.singularize(
                        result[i][j].term
                    )
                }
            }
        }

        console.log('ressult')
        console.log(result)

        fn(null, result)
    })
}

Entry.getConnectedContexts = function(receiver, perceiver, keywords, fn) {
    // Start building the context query

    var searchwords = keywords[0].keywords.split(' ')

    var keywords_query = ''

    // Are the contexts passed? If yes, add contextual query

    if (searchwords.length > 0 && searchwords[0]) {
        keywords_query = "['" + searchwords[0] + "'"

        for (var u = 1; u < searchwords.length; ++u) {
            keywords_query += ",'" + searchwords[u] + "'"
        }

        keywords_query += ']'
    }

    // Now who sees what?

    // Perceiver - the one who made the graph
    // Receiver - the one who's watching it

    if (
        (receiver == perceiver && receiver !== '') ||
        (receiver !== '' && perceiver === '')
    ) {
        var conContextQuery =
            'MATCH (c1:Concept) ' +
            'WHERE  c1.name in (' +
            keywords_query +
            ') ' +
            'WITH COLLECT(distinct c1) as concepts ' +
            'MATCH (ctx:Context) ' +
            "WHERE ALL(c in concepts WHERE (c)-->(ctx) AND ((ctx.by) = '" +
            receiver +
            "')) " +
            'RETURN ctx'

        console.log(conContextQuery)
    }

    // We retrieve statements to somebody who did not make them
    else if (receiver != perceiver) {
        var conContextQuery =
            'MATCH (c1:Concept) ' +
            'WHERE  c1.name in (' +
            keywords_query +
            ')  ' +
            'WITH COLLECT(distinct c1) as concepts ' +
            'MATCH (ctx:Context) ' +
            "WHERE ALL(c in concepts WHERE (c)-->(ctx) AND ((ctx.public) = '1' AND (ctx.by) = '" +
            perceiver +
            "')) " +
            'RETURN ctx'

        console.log(conContextQuery)
    }

    // Strange situation - we don't know who to show statements for
    else {
        var conContextQuery =
            'MATCH (c1:Concept) ' +
            'WHERE  c1.name in (' +
            keywords_query +
            ')  ' +
            'WITH COLLECT(distinct c1) as concepts ' +
            'MATCH (ctx:Context) ' +
            "WHERE ALL(c in concepts WHERE (c)-->(ctx) AND ((ctx.public) = '1' AND (ctx.by) = '" +
            perceiver +
            "')) " +
            'RETURN ctx'

        // TODO get user for public searchterms
    }

    dbneo.cypherQuery(conContextQuery, function(err, statements) {
        if (err) {
            err.type = 'neo4j'
            return fn(err)
        }

        // debug to see what info about the statements is shown
        // console.log(statements);

        fn(null, statements.data)
    })
}

Entry.getConnectedContextsOut = function(receiver, perceiver, keywords, fn) {
    // Start building the context query

    var searchwords = keywords[0].keywords.split(' ')

    var keywords_query = ''

    console.log(searchwords)
    // Are the contexts passed? If yes, add contextual query

    if (searchwords.length > 0 && searchwords[0]) {
        keywords_query = "['" + searchwords[0] + "'"

        for (var u = 1; u < searchwords.length; ++u) {
            keywords_query += ",'" + searchwords[u] + "'"
        }

        keywords_query += ']'
    }

    // Now who sees what?

    // Perceiver - the one who made the graph
    // Receiver - the one who's watching it

    var conContextQuery =
        'MATCH (c1:Concept) ' +
        'WHERE  c1.name in (' +
        keywords_query +
        ')  ' +
        'WITH COLLECT(distinct c1) as concepts ' +
        'MATCH (ctx:Context)-[:BY]->(u:User) ' +
        "WHERE ALL(c in concepts WHERE (c)-->(ctx) AND ((ctx.public) = '1')) " +
        'RETURN DISTINCT ctx,u.name'

    console.log(conContextQuery)

    // Strange situation - we don't know who to show statements for

    dbneo.cypherQuery(conContextQuery, function(err, statements) {
        if (err) {
            err.type = 'neo4j'
            return fn(err)
        }

        // debug to see what info about the statements is shown
        // console.log(statements);

        fn(null, statements.data)
    })
}

Entry.getNodes = function(
    receiver,
    perceiver,
    contexts,
    fullview,
    showcontexts,
    res,
    req,
    fn
) {
    var context_query = ''
    var view_filter = ''
    var show_contexts = ''
    var querynodes = ''

    // Are the contexts passed? If yes, change relation query to query specific contexts

    var contexts_map = []

    if (!res.locals.contextslist) {
        if (req.contextids) {
            for (var i = 0; i < req.contextids.length; i++) {
                contexts_map[i] = []
                contexts_map[i][0] = req.contextids[i].name
                contexts_map[i][1] = req.contextids[i].uid
            }
        }
    } else {
        contexts_map = res.locals.contextslist
    }

    // TODO for one context this is a more optimal query
    // PROFILE CALL apoc.index.relationships('TO','context:34b4a5b0-0dfa-11e9-98ed-7761a512a9c0') YIELD rel, start, end WITH DISTINCT rel, start, end RETURN DISTINCT start.uid AS source_id, start.name AS source_name, end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight;

    if (fullview == null) {
        view_filter = "WHERE (rel.gapscan='2' OR rel.gapscan IS NULL)  "
    }

    querynodes = 'CALL '

    // This is when we view a graph for specific contexts

    if (contexts.length > 0 && contexts[0]) {
        for (var u = 0; u < contexts.length; ++u) {
            if (u > 0) {
                querynodes += ' UNION CALL '
            }
            querynodes +=
                " apoc.index.relationships('TO','context:" +
                Instruments.findInArray(contexts_map, contexts[u]) +
                "') "
            querynodes +=
                ' YIELD rel, start, end ' +
                view_filter +
                ' WITH DISTINCT rel, start, end ' +
                ' RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                ' end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                ' rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight '
            if (u == 0) {
                context_query = ' WHERE '
            }
            context_query +=
                " rel.context='" +
                Instruments.findInArray(contexts_map, contexts[u]) +
                "' "
            if (u < contexts.length - 1) {
                context_query += ' OR '
            }
        }
    }

    // This is when we view all the (publicly) available graphs of a person...
    else {
        // If we don't have too many contexts yet to show, we can do an optimized query:
        if (contexts_map.length <= 3) {
            for (var c = 0; c < contexts_map.length; c++) {
                if (c > 0) {
                    querynodes += ' UNION CALL '
                }

                querynodes +=
                    " apoc.index.relationships('TO','context:" +
                    contexts_map[c][1] +
                    "') "
                querynodes +=
                    ' YIELD rel, start, end ' +
                    view_filter +
                    ' WITH DISTINCT rel, start, end ' +
                    ' RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                    ' end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                    ' rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight '

                if (c == 0) {
                    context_query = ' WHERE '
                }
                context_query += " rel.context='" + contexts_map[c][1] + "' "
                if (u < contexts.length - 1) {
                    context_query += ' OR '
                }
            }
        }

        // We have more than 3 contexts, so the query will be a bit long, therefore we design it differently
        else {
            if (
                (receiver == perceiver && receiver !== '') ||
                (receiver !== '' && perceiver === '')
            ) {
                console.log('Receiver = Perceiver')
                console.log('Retrieving nodes for User UID: ' + receiver)
                console.log('Retrieving nodes made by UID: ' + perceiver)

                // Do we show the contexts?

                // TODO this is a request for when we need only a few contexts

                // var filter_context = '';
                //
                // for (var i=0;i<contexts_map.length;i++) {
                //   if (contexts_map[i][1] != 'undefined'){
                //     filter_context += 'context:' + contexts_map[i][1];
                //     if (i<contexts_map.length-1) {
                //       filter_context += ' OR ';
                //     }
                //   }
                // }

                var filter_context = ''

                for (var i = 0; i < contexts_map.length; i++) {
                    if (contexts_map[i][1] != 'undefined') {
                        filter_context += contexts_map[i][1]
                        if (i < contexts_map.length - 1) {
                            filter_context += ' '
                        }
                    }
                }

                querynodes =
                    "CALL apoc.index.relationships('TO','context:(" +
                    filter_context +
                    ")') " +
                    'YIELD rel, start, end ' +
                    view_filter +
                    "WITH DISTINCT rel, start, end WHERE rel.user='" +
                    receiver +
                    "' " +
                    'RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                    'end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                    'rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight '
            } else if (receiver != perceiver && perceiver !== '') {
                console.log('Receiver != Perceiver')
                console.log('Retrieving nodes for User UID: ' + receiver)
                console.log('Retrieving nodes made by UID: ' + perceiver)

                // WHEN USING THI, ADD AFTER WITH DISTINCT AND CHANGE TO to 'user:" + perceiver + "'
                // context_query = " MATCH (ctx:Context) WHERE ctx.public = '1' AND ctx.uid = rel.context ";

                var filter_context = ''

                for (var i = 0; i < contexts_map.length; i++) {
                    if (contexts_map[i][1] != 'undefined') {
                        filter_context += contexts_map[i][1]
                        if (i < contexts_map.length - 1) {
                            filter_context += ' '
                        }
                    }
                }

                querynodes =
                    "CALL apoc.index.relationships('TO','context:(" +
                    filter_context +
                    ")') " +
                    'YIELD rel, start, end ' +
                    view_filter +
                    "WITH DISTINCT rel, start, end WHERE rel.user='" +
                    perceiver +
                    "' " +
                    'RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                    'end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                    'rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight '

                //
                // ANOTHER VERSION OF THE QUERY
                // MIGHT BE A BIT BETTER FOR WHEN WE HAVE ABOUT 10 DIFFERENT CONTEXTS, BUT GETS HEAVY WHEN THERE'S more

                // for (var c = 0; c < contexts_map.length; c++) {
                //
                //   if (c == 0) {
                //     if (view_filter.length == 0) {
                //         context_query = " WHERE "
                //     }
                //     else {
                //         context_query = " AND "
                //     }
                //   }
                //   context_query += "(rel.context='" + contexts_map[c][1] + "')";
                //   if (c < contexts_map.length - 1) {
                //     context_query += " OR "
                //   }
                //
                // }
            }
        }
    }

    if (showcontexts) {
        if (
            (receiver == perceiver && receiver !== '') ||
            (receiver !== '' && perceiver === '')
        ) {
            show_contexts =
                " UNION CALL apoc.index.relationships('AT','user:" +
                receiver +
                "') " +
                'YIELD rel, start, end ' +
                view_filter +
                'WITH DISTINCT rel, start, end ' +
                context_query +
                'RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                'end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                'rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight;'
        } else if (receiver != perceiver && perceiver !== '') {
            show_contexts =
                " UNION CALL apoc.index.relationships('TO','user:" +
                perceiver +
                "') " +
                'YIELD rel, start, end ' +
                view_filter +
                'WITH DISTINCT rel, start, end ' +
                context_query +
                'RETURN DISTINCT start.uid AS source_id, start.name AS source_name, ' +
                'end.uid AS target_id, end.name AS target_name, rel.uid AS edge_id, ' +
                'rel.context AS context_id, rel.statement AS statement_id, rel.weight AS weight;'
        }
        querynodes = querynodes + show_contexts
    }

    console.log(querynodes)

    dbneo.cypherQuery(querynodes, function(err, nodes) {
        if (err) {
            err.type = 'neo4j'
            return fn(err)
        }

        var nodes_object = nodes.data

        var g = {
            nodes: [],
            edges: [],
        }

        // Custom stopwords for this graph
        // TODO CODE REPEAT from validate.js — export it into a separate function

        var stopwords_custom = ''

        // Do stopwords exist for this particular view set by the user who created it?
        if (res.locals.vieweduser && res.locals.vieweduser.stopwords) {
            stopwords_custom = res.locals.vieweduser.stopwords
        }

        // Ok, then use the user's own stopwords, but ONLY if he is NOT viewing somebody else's graph
        else if (!res.locals.viewuser) {
            if (res.locals.user.stopwords) {
                stopwords_custom = res.locals.user.stopwords
            }
        }

        var stopwords_add = stopwords_custom.split(/[\s,;\t\n]+/)

        for (var i = 0; i < stopwords_add.length; i++) {
            if (stopwords_add[i].charAt(0) == '-') {
                stopwords_add[i] = ''
            }
        }

        // A new sorted array
        var sorted = []
     
        // Let's reiterate through all the results 
        // We count the total weight of the node's edges to then select a certain top number of them
        // TODO this can also be moved in the actual Neo4J query for big graphs to save processing time retrieving all data
        // https://stackoverflow.com/questions/54169281/any-way-to-filter-out-the-most-frequent-terms-in-neo4j-apoc-request

        for (var i = 0; i < nodes_object.length; i++) {
            // Set index for source and target to -1
            var indexsource = -1
            var indextarget = -1

            // Reiterate through the sorted array
            for (var j = 0; j < sorted.length; j++) {
                // Is there anywhere in this array the UID of the source node? Yes? We set the index to 1
                // NOTE used to be sorted[j].val = nodes_object[i][0] but in this case because of a previous DB bug if duplicate nodes with different IDs appeared they'd be added both and then sigma fails

                if (sorted[j].name == nodes_object[i][1]) indexsource = j
            }

            // Make compatible with DB where there's no edge weight
            if (!nodes_object[i][7]) nodes_object[i][1] = 3;

            // We did not find that source UID in the sorted?
            if (indexsource == -1) {
                
                if (stopwords_add.indexOf(nodes_object[i][1]) == -1) {
                    sorted.push({
                        val: nodes_object[i][0],
                        name: nodes_object[i][1],
                        count: nodes_object[i][7],
                    })
                }
            }
            // We found it? Then add more to the count
            else {
                if (sorted[indexsource].val == nodes_object[i][0]) {
                    sorted[indexsource].count += nodes_object[i][7];
                }
            }

            // Reiterate through the sorted array again
            for (var j = 0; j < sorted.length; j++) {
                // Is there anywhere in this array the UID of the target node? Yes? Set the index to 1
                // NOTE used ot be sorted[j].val = nodes_object[i][2]
                if (sorted[j].name == nodes_object[i][3]) indextarget = j
            }

            if (indextarget == -1) {
                if (stopwords_add.indexOf(nodes_object[i][3]) == -1) {
                    sorted.push({
                        val: nodes_object[i][2],
                        name: nodes_object[i][3],
                        count: nodes_object[i][7],
                    })
                }
            } else {
                if (sorted[indextarget].val == nodes_object[i][2]) {
                    sorted[indextarget].count += nodes_object[i][7];
                }
            }
        }

        sorted.sort(function(a, b) {
            if (a.count > b.count) return -1
            if (a.count < b.count) return 1
            return 0
        })

        var maxnodes = options.settings.max_nodes

        if (req.query.maxnodes) {
            if (isInt(req.query.maxnodes)) {
                maxnodes = req.query.maxnodes
            }

            function isInt(value) {
                return (
                    !isNaN(value) &&
                    (function(x) {
                        return (x | 0) === x
                    })(parseFloat(value))
                )
            }
        } else if (res.locals.user) {
            if (res.locals.user.maxnodes) {
                maxnodes = res.locals.user.maxnodes
            }
        }

        sorted = sorted.slice(0, maxnodes)

        // Show the nodes sorted after cutoff
        // console.log(sorted)

        // Reiterate through all the edges we got and see if source/target is in the top maxnodes nodes

        // All the graph model added edges
        var edges_added = {}
        var statements_ids = []
        var edges_weight = []

        for (var i = 0; i < nodes_object.length; i++) {
            var sourcein = null
            var targetin = null

            // Check if that particular edge has both the source and the target in the top maxnodes nodes

            for (var j = 0; j < sorted.length; j++) {
                if (sorted[j].val == nodes_object[i][0]) {
                    sourcein = 1
                }
                if (sorted[j].val == nodes_object[i][2]) {
                    targetin = 1
                }
            }

            // Yes, both the edge and the target are in the top nodes

            if (sourcein && targetin) {
                // If the edge has no weight, add an arbitrary 3 one
                if (!nodes_object[i][7]) {
                    nodes_object[i][7] = 3
                }

                // If the edge doesn't have an ID it's because it's of the :AT kind and it's a context connecting to concept
                if (!nodes_object[i][4]) {
                    nodes_object[i][4] = 'context' + uuid.v1()
                }

                g.nodes.push({
                    id: nodes_object[i][0],
                    label: nodes_object[i][1],
                })

                g.nodes.push({
                    id: nodes_object[i][2],
                    label: nodes_object[i][3],
                })    
                
                let current_context_name = Instruments.findInArray(contexts_map, nodes_object[i][5], 1);

                // Did we already add an edge with the same source and target AND with this particular context?
                if (edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]]) {     
                    // We have this same edge with the same context already?
                    if (edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].context_matrix[current_context_name]) {
                        // Add another statement to that edge 
                        edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].context_matrix[current_context_name][nodes_object[i][6]] = nodes_object[i][7];
                        edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].weight += nodes_object[i][7];
                    }
                    // We have an edge connecting these nodes but the context is different
                    else {
                        // Let's add the new context
                        edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].context_matrix[current_context_name] = {};
                        edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].context_matrix[current_context_name][nodes_object[i][6]] = nodes_object[i][7];
                        edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]].weight += nodes_object[i][7];
                    }
                } 
                else {
                    // Form a new context-statement object
                    
                    // Objects that will hold the data
                    let context_statement = {};

                    context_statement[current_context_name] = {};

                    // A particular statement and its weight
                    context_statement[current_context_name][nodes_object[i][6]] = nodes_object[i][7];

                    // Create a new edge 
                    edges_added[nodes_object[i][0] + '-' + nodes_object[i][2]] = {
                        source: nodes_object[i][0],
                        target: nodes_object[i][2],
                        id: nodes_object[i][4],
                        context_matrix: context_statement,
                        weight: nodes_object[i][7]
                    };
                }


            }
        }

        // TODO fix that some statements appear twice, some are gone issue #11

        g.nodes = Instruments.uniqualizeArray(g.nodes, JSON.stringify)

        g.nodes.sort(function(a, b) {
            if (a.label < b.label) return -1
            if (a.label > b.label) return 1
            return 0
        })

        for (var key in edges_added) {
            g.edges.push(edges_added[key]);
        }
 
        // if (g.nodes.length == 0) {
        //     g.nodes.push({
        //         id: 'dummy',
        //         label: '',
        //     })
        // }
        // console.log(edges_added);

        fn(null, g)
    })
}
