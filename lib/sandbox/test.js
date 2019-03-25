var neo4j = require('node-neo4j');

var options = require('../../options');
dbneo = new neo4j(options.neo4jlink);

dbneo.cypherQuery('MATCH (u:User{substance:"deemeetree"}) RETURN u.uid;', function(err, uid){

    if(err) {
        err.type = 'neo4j';
        console.log(err);


    }

    // Pass this on to the next function
    console.log(uid.data[0]);


});
