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
 *
 * A part of "Textexture" algorithm below for converting a sequence of words
 * and / or hashtags derived from a text into a network graph is pending for
 * patent application.
 *
 * You are free to implement it for personal non-commercial use in your own
 * open-source software if you retain this notice.
 *
 * For commercial use and/or if your software is not open-source, please,
 * contact vortex@textexture.com for the explicit written permission.
 *
 */

/**
 *
 * This is a CypherQuery constructor to add rich edge annotation to Neo4J
 * TODO: Support for OrientDB, Titanium and some iOS/Android based DB
 *
 */



var uuid = require('node-uuid');

var neo4j = require('node-neo4j');

var options = require('../../options');
dbneo = new neo4j(options.neo4jlink);

var neo4jnew = require('neo4j-driver').v1;


module.exports = CypherQuery;


// Modules to convert hashtags/concepts into DB-friendly terms
var transliteration = require('transliteration.cyr');

// Load a map of accents to replace from options.js file
var accentsMap = options.accentmap;

// Load a map of digits to replace from options.js file
var digitsMap = options.digitsmap;


// Create an prototype

function CypherQuery() {

}


function convertName(input) {

    // Transliterate if necessary
    var output = transliteration.transliterate(input);

    // Replace the digits with their word equivalent
    for(var i=0; i<digitsMap.length; i++) {
        output = output.replace(digitsMap[i].base, digitsMap[i].letters);
    }

    // Replace accented letters with their normal equivalent
    for(var i=0; i<accentsMap.length; i++) {
        output = output.replace(accentsMap[i].letters, accentsMap[i].base);
    }

    output = output.replace(/-/g, "");

    output = 'cc_' + output;

    return output;
}

function convertMention(input) {

    // get rid of the first @ sign

    var output = input.substring(1);

    // Transliterate if necessary

    output = transliteration.transliterate(output);

    // Replace the digits with their word equivalent
    for(var i=0; i<digitsMap.length; i++) {
        output = output.replace(digitsMap[i].base, digitsMap[i].letters);
    }

    // Replace accented letters with their normal equivalent
    for(var i=0; i<accentsMap.length; i++) {
        output = output.replace(accentsMap[i].letters, accentsMap[i].base);
    }

    output = 'mm_' + output;

    return output;
}



CypherQuery.addStatement = function(user,concepts,statement,contexts,mentions,addmentions,gapscan,callback) {

    // Generate new timestamp and multiply it by 10000 to be able to track the sequence the nodes were created in
    var timestamp = statement.timestamp;

    // Generate unique ID for the node
    var node_uid = uuid.v1();

    // Generate unique ID for the mention
    var ment_uid = uuid.v1();

    // Generate unique ID for the mention to node link
    var edgement_uid = uuid.v1();

    // Create an array variable to store the already added Nodes to avoid duplicates in Cypher MERGE query for Concepts
    var concepts_added = [];

    // Create an array variable to store the already added Mentions to avoid duplicates in Cypher MERGE query for Mentions
    var mentions_added = [];

    // Define some variables for edges and scans

    // Weight of connection when the words are next to each other
    var narrativeScanWeight = 3;

    // Weight of connection when the words are next to each other in a scan gap
    var landscapeScanWeight = 3;

    // Do we do a wider gap scan?
    var gapscan = gapscan || null;

    // Scan gap width from the gapscan parameter. By default it equals 4 if nothing is passed.
    var scanGap = 4;

    // Create variables we use to create a Neo4J query
    var createMentionsQuery = '';
    var createFirstMentionQuery = '';
    var matchUser = '';
    var createContexts = '';
    var createStatement = '';
    var createNodesQuery = '';
    var createEdgesQuery = '';
    var createNodesEdgesQuery = '';


    // Define starting points for each part of the query

    matchUser += 'MATCH (u:User {uid: "' + user.uid + '"}) ';

    // Add contexts to the query

    for (var cindx = 0; cindx < contexts.length; ++ cindx) {

        //Build context query
        // TODO add logic to remove extra {timestamp} connections between context and user

        createContexts += 'MERGE (' + 'c_' + contexts[cindx].name + ':Context ' + '{name:"' + contexts[cindx].name + '",by:"' + user.uid + '",uid:"'+contexts[cindx].uid+'"}) ON CREATE SET ' + 'c_' + contexts[cindx].name + '.timestamp="' + timestamp + '" MERGE ' + '(c_' + contexts[cindx].name + ')' + '-[:BY{timestamp:"' + timestamp + '"}]->(u) ';
    }

    // Create the statement

    if (concepts.length > 0) {
        createStatement += 'CREATE (s:Statement ' + '{name:"#' + concepts[0];
    }
    else {
        createStatement += 'CREATE (s:Statement ' + '{name:"';
    }

    // Create the node

    if (concepts.length > 0) {
        createNodesQuery += 'MERGE (' + convertName(concepts[0]) + ':Concept ' + '{name:"' + concepts[0] + '"}) ON CREATE SET ' + convertName(concepts[0]) + '.timestamp="' + timestamp + '", ' + convertName(concepts[0]) +  '.uid="' + node_uid + '" ';
    }

    // Create the mentions

    if (typeof mentions !== 'undefined' && mentions.length > 0) {

        // Create mentions first

        ment_uid = uuid.v1();

        for (var puka = 0; puka < mentions.length; puka++) {

            if (mentions_added.indexOf(mentions[puka]) == -1) {

                var current_mention = mentions[puka];
                if (addmentions == 'remove' || addmentions == 'link') {
                  current_mention = current_mention.substring(1);
                }

                createFirstMentionQuery += 'MERGE (' + convertMention(mentions[puka]) + ':Concept ' + '{name:"' + current_mention + '"}) ON CREATE SET ' + convertMention(mentions[puka]) + '.timestamp="' + (timestamp + puka) + '", ' + convertMention(mentions[puka])  + '.uid="' + ment_uid + '" ';

                // Add the node we just added into another array, to check for duplicates in the next cycle
                mentions_added.push(mentions[puka]);

                ment_uid = uuid.v1();
            }
        }

    }

    // Link the first concept to all the contexts and to all the users

    if (concepts.length > 0) {

        for (var indx = 0; indx < contexts.length; ++ indx) {

            // Link to user
            createEdgesQuery += 'CREATE (' + convertName(concepts[0]) + ')-[:BY {context:"' + contexts[indx].uid + '",timestamp:"' + timestamp + '",statement:"' + statement.uid + '"}]->(u) ';

            // Link to context
            createEdgesQuery += 'CREATE (' + convertName(concepts[0]) + ')-[:OF {context:"' + contexts[indx].uid + '",user:"' + user.uid + '",timestamp:"' + timestamp + '"}]->(s)  CREATE (' + convertName(concepts[0]) + ')-[:AT {user:"' + user.uid + '",timestamp:"' + timestamp + '",context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '"}]->('+'c_' + contexts[indx].name+') ';

            // Link the first concept to all the mentions in all the contexts
            if (typeof mentions !== 'undefined' && mentions.length > 0) {
                for (var index = 0; index < mentions.length; index++) {
                    edgement_uid = uuid.v1();
                    createMentionsQuery += 'CREATE (' + convertName(concepts[0]) +')-[:TO {context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp)+'",uid:"' + edgement_uid + '",gapscan:"1",weight:"' + narrativeScanWeight + '"}]->(' + convertMention(mentions[index]) + ') ';
                }
            }

        }

        concepts_added.push(concepts[0]);

    }

    // To avoid duplicates in Cypher MERGE for nodes


    // If the statement has only one node, add an edge where it links to itself, so it can be shown in the graph along with its context
    if (concepts.length == 1) {

        // For every context make a link between the concept and itself

        // If there are no mentions at all and only one concept, we link it to itself
        if (mentions.length == 0) {

            edge_uid = uuid.v1();

            // For every context, make a link between the only concept and itself

            for (var nindx = 0; nindx < contexts.length; ++ nindx) {

                createEdgesQuery += 'CREATE (' + convertName(concepts[0]) +')-[:TO {context:"' + contexts[nindx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp)+'",uid:"' + edge_uid + '",gapscan:"2",weight:"' + narrativeScanWeight + '"}]->(' + convertName(concepts[0]) + ') ';

                edge_uid = uuid.v1();

            }

        }

    }

    // If the statement has only one mention, but no concepts at all, we link that @Mention to itself as it wasn't linked to a concept before
    if (mentions.length == 1) {

        // Only if there are no concepts, meaning we couldn't link the @Mention to a concept, then we link the @mention to itself

        if (concepts.length == 0) {

            ment_uid = uuid.v1();

            // Iterating the iteration to accommodate all the contexts
            for (var mindx = 0; mindx < contexts.length; ++ mindx) {

                createMentionsQuery += 'CREATE (' + convertMention(mentions[0]) +')-[:TO {context:"' + contexts[mindx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp)+'",uid:"' + ment_uid + '",gapscan:"1",weight:"' + narrativeScanWeight + '"}]->(' + convertMention(mentions[0]) + ') ';

                ment_uid = uuid.v1();
            }
        }
    }

    // Start loop for adding nodes, edges, and their relations

    for (var index = 1; index < concepts.length; ++ index) {

        // Generate unique IDs for nodes and edges
        node_uid = uuid.v1();
        edge_uid = uuid.v1();

        // Make sure the node has not yet been added

        if (concepts_added.indexOf(concepts[index]) == -1) {

            createNodesQuery += 'MERGE (' + convertName(concepts[index]) + ':Concept ' + '{name:"' + concepts[index] + '"}) ON CREATE SET ' + convertName(concepts[index]) + '.timestamp="' + (timestamp + index) + '", ' + convertName(concepts[index])  + '.uid="' + node_uid + '" ';

            // Add the node we just added into another array, to check for duplicates in the next cycle
            concepts_added.push(concepts[index]);
        }


        // Connect the words / hashtags that follow one another within the narrative - 2 Word Scan

        var minusOne = index - 1;

        // Let's make sure the previous node was not the same as the current

        if (concepts[minusOne] !== concepts[index]) {

            // Iterating the iteration to accommodate all the contexts
            for (var indx = 0; indx < contexts.length; ++ indx) {

              // We link concepts to each other only if there are either no mentions or if there is a mention and a special setting
              if ((mentions.length == 0) || (mentions.length > 0 && addmentions != 'link')) {

                createEdgesQuery += 'CREATE (' + convertName(concepts[minusOne]) +')-[:TO {context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp+index)+'",uid:"' + edge_uid + '",gapscan:"2",weight:"' + narrativeScanWeight + '"}]->(' + convertName(concepts[index]) + ') ';

              }
                // Create unique ID for the next edge
                edge_uid = uuid.v1();

                // Now link this concept to all the mentions again and this happens in all the contexts

                if (typeof mentions !== 'undefined' && mentions.length > 0) {
                    for (var m = 0; m < mentions.length; m++) {
                        edgement_uid = uuid.v1();
                        createMentionsQuery += 'CREATE (' + convertName(concepts[index]) +')-[:TO {context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp)+'",uid:"' + edgement_uid + '",gapscan:"1",weight:"' + narrativeScanWeight + '"}]->(' + convertMention(mentions[m]) + ') ';
                    }
                }

            }
        }

        // Implement the algorithm that connects words / hashtags within the same statement within the scanGap of words

        if (gapscan) {

          // This only gets triggered if no special case with mentions is used

          if ((mentions.length == 0) || (mentions.length > 0 && addmentions != 'link')) {


            // Determine the word to the furthest left of the gap (the beginning of scan)
            var leftGap = (index + 1) - scanGap;

            // If we went beyond the start of the text, make it zero
            if (leftGap < 0) leftGap = 0;

            // Now scan every word from the one we are now to the scanGap words backwards and give them the relevant weight

            for (var indexGap = leftGap; indexGap < (index - 1); ++indexGap) {

                // If the words are next to each other in the gap, they get the max weight. Otherwise it decreases.
                var weightInGap = (landscapeScanWeight + 1) - (index - indexGap);

                // The two concepts we're going to link are not the same?

                if (concepts[indexGap] !== concepts[index]) {

                    // Iterating through all the contexts

                    for (var indx = 0; indx < contexts.length; ++ indx) {

                        // Create unique ID for this edge
                        edge_uid = uuid.v1();

                        // Make query
                        createEdgesQuery += 'CREATE (' + convertName(concepts[indexGap]) +')-[:TO {context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp+index)+'",uid:"' + edge_uid + '",gapscan:"' + scanGap + '",weight:"' + weightInGap + '"}]->(' + convertName(concepts[index]) + ') ';



                    }
                }

            }

          }

        }



        // Let's link that concept to Statement, Context and User even if there was a similar one before (can use it later for Weight)

        for (var indx = 0; indx < contexts.length; ++ indx) {
            createEdgesQuery += 'CREATE (' + convertName(concepts[index])  + ')-[:BY {context:"' + contexts[indx].uid + '",timestamp:"' +(timestamp+index)+ '",statement:"' + statement.uid + '"}]->(u) ';
            createEdgesQuery += 'CREATE (' + convertName(concepts[index]) + ')-[:OF {context:"' + contexts[indx].uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp+index)+'"}]->(s) CREATE (' + convertName(concepts[index]) + ')-[:AT {user:"' + user.uid + '",timestamp:"' + (timestamp+index) + '",context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '"}]->('+ 'c_' + contexts[indx].name +') ';
        }

        createStatement += ' #' + concepts[index];


    }



    // Start loop for adding mentions
    if (mentions.length > 0) {

        for (var index = 0; index < mentions.length; index++) {

            // Generate unique IDs for nodes and edges
            var node_uid = uuid.v1();
            var edge_uid = uuid.v1();

            // TODO add a setting where mentions only connect if they are next to each other (not all to all)

            for (var iter = 0; iter < index; iter++) {

                if (mentions[iter] !== mentions[index]) {

                    // Iterating the iteration to accommodate all the contexts
                    for (var indx = 0; indx < contexts.length; ++ indx) {

                        createMentionsQuery += 'CREATE (' + convertMention(mentions[iter]) +')-[:TO {context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp+index)+'",uid:"' + edge_uid + '",gapscan:"1",weight:"' + narrativeScanWeight + '"}]->(' + convertMention(mentions[index]) + ') ';

                        // Create unique ID for the next edge
                        edge_uid = uuid.v1();

                    }

                }

            }


            // Let's link that concept to Statement, Context and User even if there was a similar one before (can use it later for Weight)


            for (var indx = 0; indx < contexts.length; ++ indx) {
                createMentionsQuery += 'CREATE (' + convertMention(mentions[index])  + ')-[:BY {context:"' + contexts[indx].uid + '",timestamp:"' +(timestamp+index)+ '",statement:"' + statement.uid + '"}]->(u) ';
                createMentionsQuery += 'CREATE (' + convertMention(mentions[index]) + ')-[:OF {context:"' + contexts[indx].uid + '",user:"' + user.uid + '",timestamp:"'+(timestamp+index)+'"}]->(s) CREATE (' + convertMention(mentions[index]) + ')-[:AT {user:"' + user.uid + '",timestamp:"' + (timestamp+index) + '",context:"' + contexts[indx].uid + '",statement:"' + statement.uid + '"}]->('+ 'c_' + contexts[indx].name +') ';
            }

            createStatement += ' ' + mentions[index];

        }
    }

    createStatement += '", text:"' + statement.text + '", uid:"' + statement.uid + '", timestamp:"' + timestamp + '"}) ';

    for (var indx = 0; indx < contexts.length; ++ indx) {
        createStatement += 'CREATE (s)-[:BY {context:"' + contexts[indx].uid + '",timestamp:"' + timestamp + '"}]->(u) ';
        createStatement += 'CREATE (s)-[:IN {user:"' + user.uid + '",timestamp:"'+timestamp+'"}]->('+'c_' + contexts[indx].name+') ';
    }

    createNodesEdgesQuery += matchUser + createContexts + createStatement + createFirstMentionQuery + createNodesQuery + createEdgesQuery + createMentionsQuery + ' RETURN s.uid;';

    callback(createNodesEdgesQuery);

};
