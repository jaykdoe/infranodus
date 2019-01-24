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


function convertName(input, array) {

    // // Transliterate if necessary
    // var output = transliteration.transliterate(input);
    //
    // // Replace the digits with their word equivalent
    // for(var i=0; i<digitsMap.length; i++) {
    //     output = output.replace(digitsMap[i].base, digitsMap[i].letters);
    // }
    //
    // // Replace accented letters with their normal equivalent
    // for(var i=0; i<accentsMap.length; i++) {
    //     output = output.replace(accentsMap[i].letters, accentsMap[i].base);
    // }
    //
    // output = output.replace(/-/g, "");

    var index = array.indexOf(input);

    output = 'cc_' + index;

    return output;
}

function convertMention(input, array) {

    // // get rid of the first @ sign
    //
    // var output = input.substring(1);
    //
    // // Transliterate if necessary
    //
    // output = transliteration.transliterate(output);
    //
    // // Replace the digits with their word equivalent
    // for(var i=0; i<digitsMap.length; i++) {
    //     output = output.replace(digitsMap[i].base, digitsMap[i].letters);
    // }
    //
    // // Replace accented letters with their normal equivalent
    // for(var i=0; i<accentsMap.length; i++) {
    //     output = output.replace(accentsMap[i].letters, accentsMap[i].base);
    // }

    var index = array.indexOf(input);

    output = 'mm_' + index;

    return output;
}



CypherQuery.addStatement = function(user, statements, contexts, addmentions, gapscan, callback) {

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
    var matchUser = '';
    var createContexts = '';
    var createStatement = '';
    var createNodesQuery = '';
    var createEdgesQuery = '';
    var createMEdgesQuery = '';
    var createNodesEdgesQuery = '';

    var mentions_exist = [];
    var concepts_exist = [];



    var params = {
      userId: user.uid,
      contextNames: [],
      statements: [],
      timestamp: ''
    };

    // TODO
    // Get the UUIDs into statements for each statement
    // conceptRelations and mentionRelations will be made using these IDs, so we'll know where they fit exactly

    // Define starting points for each part of the query

    matchUser += 'MATCH (u:User {uid: $userId}) ';

    // Add the first timestamp
    params['timestamp'] = statements[0].timestamp;

    // Add statements, hashtags, mentions, timestamps into the query

    for (var indx = 0; indx < statements.length; ++ indx) {
        params['statements'].push(statements[indx]);
    }

    // Add contexts to the query

    for (var indx = 0; indx < contexts.length; ++ indx) {
        params['contextNames'].push(contexts[indx]);
    }

    createContexts += 'UNWIND $contextNames as contextName ';
    createContexts += 'MERGE (context:Context ' + '{name:contextName.name,by:u.uid,uid:contextName.uid}) ';
    createContexts += 'ON CREATE SET context.timestamp=$timestamp MERGE (context)-[:BY{context:context.uid}]->(u) ';

    // Create the statement

    createStatement += 'WITH DISTINCT u, context ';
    createStatement += 'UNWIND $statements as statement ';
    createStatement += 'CREATE (s:Statement ' + '{name:statement.name, text:statement.text, uid:statement.uid, timestamp:statement.timestamp}) ';
    createStatement += 'CREATE (s)-[:BY {context:context.uid,timestamp:s.timestamp}]->(u) ';
    createStatement += 'CREATE (s)-[:IN {user:u.id,timestamp:s.timestamp}]->(context) ';

    // Create the node

    for (var sindex = 0; sindex < params['statements'].length; sindex++) {

          // First, let's iterate through the concepts

          var mentions;
          var concepts;
          var timestamp = params['statements'][sindex]['timestamp'];

          if (params['statements'][sindex]['concepts']) {
            mentions = params['statements'][sindex]['mentions'];
          }

          if (params['statements'][sindex]['concepts']) {

              concepts = params['statements'][sindex]['concepts'];

              params['statements'][sindex]['uniqueconcepts'] = [];

              params['statements'][sindex]['conceptsRelations'] = [];

              params['statements'][sindex]['mentionsRelations'] = [];

              for (var index = 0; index < concepts.length; index++) {

                // TODO only 1 concept

                // Start adding EDGES for concepts into the PARAMS

                if (index > 0) {
                    // Connect the words / hashtags that follow one another within the narrative - 2 Word Scan

                    var minusOne = index - 1;

                    // Let's make sure the previous node was not the same as the current

                    if (concepts[minusOne] !== concepts[index]) {

                        // Iterating the iteration to accommodate all the contexts
                        for (var indx = 0; indx < contexts.length; ++ indx) {

                          // We link concepts to each other only if there are either no mentions or if there is a mention and a special setting
                          if ((mentions.length == 0) || (mentions.length > 0 && addmentions != 'link')) {

                            // FIRST construct an object and then proceed
                            params['statements'][sindex]['conceptsRelations'].push({from:concepts[minusOne],to:concepts[index],context:contexts[indx].uid,statement:params['statements'][sindex]['uid'],user:user.uid,timestamp:timestamp+index,uid:'apoc.create.uuid()',gapscan:"2",weight:narrativeScanWeight});


                          }


                        // Finished iterating through contexts

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

                                    // Make query
                                    params['statements'][sindex]['conceptsRelations'].push({from:concepts[indexGap],to:concepts[index],context:contexts[indx].uid,statement:params['statements'][sindex]['uid'],user:user.uid,timestamp:timestamp+index,uid:'apoc.create.uuid()',gapscan:scanGap,weight:weightInGap});

                                }
                            }

                        }

                      }

                    }
                  }


                  // Adding nodes, This concept yet doesn't exist in our DB?

                  if (concepts_added.indexOf(concepts[index]) == -1) {

                      concepts_exist[sindex] = (index + 1);


                      // Add into array to check for duplicates in the next cycle
                      concepts_added.push(concepts[index]);

                      // Create additional Cypher params map of concepts and statement IDs they belong to, just in case

                      params['statements'][sindex]['uniqueconcepts'].push(concepts[index]);


                      // Now link this concept to all the mentions again and this happens in all the contexts
                      for (var indx = 0; indx < contexts.length; ++ indx) {

                        if (typeof mentions !== 'undefined' && mentions.length > 0) {

                              for (var m = 0; m < mentions.length; m++) {

                                  params['statements'][sindex]['mentionsRelations'].push({from:concepts[index],to:mentions[m],context:contexts[indx].uid,statement:params['statements'][sindex]['uid'],user:user.uid,timestamp:timestamp+index,uid:'apoc.create.uuid()',gapscan:"1",weight:narrativeScanWeight});


                              }
                        }
                      }

                  }


              }


                  // If the statement has only one node, add an edge where it links to itself, so it can be shown in the graph along with its context
                  if (concepts.length == 1 || params['statements'][sindex]['conceptsRelations'].length == 0) {

                      // For every context make a link between the concept and itself
                      // If there are no mentions at all and only one concept, we link it to itself
                      // Switch this condition off because if there's only once concept and several mentions we need to link it to itself otherwise the requeust bugs
                    //  if (!params['statements'][sindex]['mentions'] || params['statements'][sindex]['mentions'].length == 0 || params['statements'][sindex]['mentions'] == undefined) {
                          // For every context, make a link between the only concept and itself
                          for (var nindx = 0; nindx < contexts.length; ++ nindx) {
                            params['statements'][sindex]['conceptsRelations'].push({from:concepts[0],to:concepts[0],context:contexts[nindx].uid,statement:params['statements'][sindex]['uid'],user:user.uid,timestamp:timestamp,uid:'apoc.create.uuid()',gapscan:"2",weight:narrativeScanWeight});
                          }
                      //}

                  }
          }


        // Then let's iterate the @mentions
        if (params['statements'][sindex]['mentions']) {



                      params['statements'][sindex]['uniquementions'] = [];

                      if (!params['statements'][sindex]['mentionsRelations'] || params['statements'][sindex]['mentionsRelations'] == undefined) {
                        params['statements'][sindex]['mentionsRelations'] = [];
                      }

                      if (!params['statements'][sindex]['conceptsRelations'] || params['statements'][sindex]['conceptsRelations'] == undefined) {
                        params['statements'][sindex]['conceptsRelations'] = [];
                      }

                      for (var puka = 0; puka < params['statements'][sindex]['mentions'].length; puka++) {

                          // Create mentions first

                          if (addmentions == 'remove' || addmentions == 'link') {
                            params['statements'][sindex]['mentions'][puka] = params['statements'][sindex]['mentions'][puka].substring(1);
                          }

                          // TODO add a setting where mentions only connect if they are next to each other (not all to all)
                          for (var iter = 0; iter < puka; iter++) {

                              if (params['statements'][sindex]['mentions'][iter] !== params['statements'][sindex]['mentions'][puka]) {

                                  // Iterating the iteration to accommodate all the contexts

                                  for (var indx = 0; indx < contexts.length; ++ indx) {

                                        params['statements'][sindex]['mentionsRelations'].push({from:params['statements'][sindex]['mentions'][iter],to:params['statements'][sindex]['mentions'][puka],context:contexts[indx].uid,statement:params['statements'][sindex]['uid'],user:user.uid,timestamp:timestamp+index,uid:'apoc.create.uuid()',gapscan:"1",weight:narrativeScanWeight});

                                  }
                              }
                          }


                          if (mentions_added.indexOf(params['statements'][sindex]['mentions'][puka]) == -1) {

                              mentions_exist[sindex] = puka + 1;
                              // Add the mention we just added into another array, to check for duplicates in the next cycle
                              mentions_added.push(params['statements'][sindex]['mentions'][puka]);

                              params['statements'][sindex]['uniquementions'].push(params['statements'][sindex]['mentions'][puka]);



                          }



                      }

                      // If the statement has only one mention, but no concepts at all, we link that @Mention to itself as it wasn't linked to a concept before
                      if (params['statements'][sindex]['mentions'].length == 1 || params['statements'][sindex]['mentionsRelations'].length == 0) {

                          // Only if there are no concepts, meaning we couldn't link the @Mention to a concept, then we link the @mention to itself
                              // Iterating the iteration to accommodate all the contexts
                              for (var mindx = 0; mindx < contexts.length; ++ mindx) {
                                    params['statements'][sindex]['mentionsRelations'].push({from:params['statements'][sindex]['mentions'][0],to:params['statements'][sindex]['mentions'][0],context:contexts[mindx].uid,statement:params['statements'][sindex]['uid'].uid,user:user.uid,timestamp:timestamp,uid:'apoc.create.uuid()',gapscan:"1",weight:narrativeScanWeight});
                              }

                      }

        }


    }

    if (mentions_exist.length > 0) {
      createMentionsQuery += ' WITH DISTINCT u, s, context, statement FOREACH (mentionName in statement.uniquementions | ';

      // Create mention queries for all mentions
      createMentionsQuery += 'MERGE (mention:Concept ' + '{name:mentionName}) ON CREATE SET mention.uid=apoc.create.uuid() ';

      // Let's link that concept to Statement, Context and User even if there was a similar one before (can use it later for Weight)
      for (var indx = 0; indx < contexts.length; ++ indx) {
          createMentionsQuery += 'CREATE (mention)-[:BY {context:context.uid,timestamp:s.timestamp,statement:s.uid}]->(u) ';
          createMentionsQuery += 'CREATE (mention)-[:OF {context:context.uid,user:u.uid,timestamp:s.timestamp}]->(s) CREATE (mention)-[:AT {user:u.uid,timestamp:s.timestamp,context:context.uid,statement:s.uid}]->(context) ';
      }

      // Close the FOREACH mentions nodes cycle
      createMentionsQuery += ' ) '

    }

    if (concepts_exist.length > 0) {

        // Now that we have $concepts we can iterate through them

        createNodesQuery += ' FOREACH (conceptName in statement.uniqueconcepts | ';
        createNodesQuery += ' MERGE (c:Concept ' + '{name:conceptName}) ON CREATE SET c.uid=apoc.create.uuid() ';

        // Link to user
        createNodesQuery += 'CREATE (c)-[:BY {context:context.uid,timestamp:s.timestamp,statement:s.suid}]->(u) ';

        // Link to statement
        createNodesQuery += 'CREATE (c)-[:OF {context:context.uid,user:u.uid,timestamp:s.timestamp}]->(s)  ';

        // Link to context
        createNodesQuery += 'CREATE (c)-[:AT {user:u.uid,timestamp:s.timestamp,context:context.uid,statement:s.uid}]->(context) ';

        // Close the FOREACH nodes cycle
        createNodesQuery += ' ) ';



    }

    // To avoid duplicates in Cypher MERGE for nodes



    if (concepts_exist.length > 0) {
      createEdgesQuery += ' WITH DISTINCT u, s, statement UNWIND statement.conceptsRelations as conceptsRelation ';
      createEdgesQuery += ' MATCH (c_from:Concept{name: conceptsRelation.from})';
      createEdgesQuery += ' MATCH (c_to:Concept{name: conceptsRelation.to}) ';
      createEdgesQuery += ' CREATE (c_from)-[:TO {context:conceptsRelation.context,statement:conceptsRelation.statement,user:u.uid,timestamp:conceptsRelation.timestamp, uid:apoc.create.uuid(), gapscan:conceptsRelation.gapscan, weight: conceptsRelation.weight}]->(c_to) ';
    }

    if (mentions_exist.length > 0) {
      createMEdgesQuery += ' WITH DISTINCT u, s, statement UNWIND statement.mentionsRelations as mentionsRelation ';
      createMEdgesQuery += 'MATCH (m_from:Concept{name: mentionsRelation.from}) MATCH (m_to:Concept{name: mentionsRelation.to}) ';
      createMEdgesQuery += 'CREATE (m_from)-[:TO {context:mentionsRelation.context,statement:mentionsRelation.statement,user:u.uid,timestamp:mentionsRelation.timestamp, uid:apoc.create.uuid(), gapscan:mentionsRelation.gapscan, weight: mentionsRelation.weight}]->(m_to) ';
    }


    createNodesEdgesQuery += matchUser + createContexts + createStatement + createNodesQuery + createMentionsQuery + createEdgesQuery + createMEdgesQuery + ' RETURN DISTINCT s.uid ';

    var finalCypherQuery = {
      'query': createNodesEdgesQuery,
      'params': params
    };
    // console.log(finalCypherQuery['query']);
    // console.log('statements');
    // console.log(JSON.stringify(finalCypherQuery['params']));
    // console.log(JSON.stringify(finalCypherQuery['params']['statements']));
    // console.log(finalCypherQuery['params']);
    callback(finalCypherQuery);

};
