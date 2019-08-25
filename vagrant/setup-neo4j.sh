#!/usr/bin/env bash

DEFAULT_USERNAME="neo4j"
DEFAULT_PASSWORD="neo4j"
NEW_PASSWORD="Really_Secure_Local_Db_Password"

# 


# Change the default neo4j password
# (default is 'neo4j', but needs changing before schema changes can be made!)
cat "CALL dbms.changePassword('${PASSWORD}')" | cypher-shell -u $DEFAULT_USERNAME -p $DEFAULT_PASSWORD

# Setup indicies as per https://github.com/noduslabs/infranodus/wiki/Neo4J-Database-Setup
INDICIES=$(cat <<-END
  CREATE INDEX ON :User(name);
  CREATE INDEX ON :User(uid);
  CREATE INDEX ON :Concept(name);
  CREATE INDEX ON :Concept(uid);
  CREATE INDEX ON :Context(name);
  CREATE INDEX ON :Context(uid);
  CREATE INDEX ON :Context(by);
  CREATE INDEX ON :Statement(name);
  CREATE INDEX ON :Statement(uid);
END)

cat $INDICIES | cypher-shell -u $DEFAULT_USERNAME -p $NEW_PASSWORD
