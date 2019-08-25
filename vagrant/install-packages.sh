#!/usr/bin/env bash

# Install Neo4j
# From https://neo4j.com/docs/operations-manual/current/installation/linux/debian/
echo 'deb https://debian.neo4j.org/repo stable/' | sudo tee -a /etc/apt/sources.list.d/neo4j.list
wget --quiet -O - https://debian.neo4j.org/neotechnology.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y neo4j=1:3.5.8

# Install Neo4j APOC plugin
# From https://github.com/neo4j-contrib/neo4j-apoc-procedures#manual-installation-download-latest-release
# (if Neo4j is upgraded, APOC will likely need upgrading too! APOC 3.5.x.x works with Neo4j 3.5.x)
sudo wget --quiet --directory-prefix=/var/lib/neo4j/plugins/ \
  https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/3.5.0.4/apoc-3.5.0.4-all.jar

# Install NodeJS
# From https://github.com/nodesource/distributions#installation-instructions
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Heroku
wget --quiet -O - https://cli-assets.heroku.com/install-ubuntu.sh | sh
