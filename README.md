## InfraNodus is a text-to-network visualization tool, based on Neo4J, Node.Js and Sigma.Js.

### InfraNodus provides the fastest way to create a graph using plain text, #hashtags or @mentions. [Try it online](https://infranodus.com) or install your local version.

#### Keep track of all the connections using this simple tool that converts natural language into graph (English, Russian, French, German are supported, other languages — limited support).

#### Also use InfraNodus as an interface to your Neo4J database to quickly try out some basic graph constructs using an easy input procedure via natural language, voice-to-text and #hashtags

=================

![](/public/images/infranodus.gif "InfraNodus Interface")

=================

#### Works on mobile and desktop. Voice-to-text (EN, RU, FR, DE) is available.


[Watch a Video Demo](https://www.youtube.com/watch?v=0mIT9Ni5SO4) - a 3-minute introduction

[Try it Online](http://infranodus.com) - request invitation code through [Nodus Labs](http://noduslabs.com/infranodus/)



=================

### The Science and the Method

InfraNodus is a non-commercial [venture fiction](https://noduslabs.com/research/venture-fiction/) project. Its main objective is to enhance perception and imagination, although it can also solve concrete problems and offer you an efficient way to retain, process, and make sense of information. It can:

* Help researchers make sense of textual data
* Help you retain and remember information
* Help you connect disjointed bits and pieces of data
* Visualize patterns in complex relations
* Be used for text network analysis
* Be used to quickly create graphs using text / voice input
* Perform comparative visual analysis of texts
* Identify the structure of discourse (dispersed / biased)
* Reveal the gaps in a network (and, thus, the potential for new ideas/connections)
* Provide network metrics, identify the main communities and top nodes

The method is mainly based on the approach outlined in Paranyushkin (2011) **[Identifying the Pathways of Meaning Circulation Using Text Network Analysis](https://noduslabs.com/research/pathways-meaning-circulation-text-network-analysis/)**.

A more precise description of InfraNodus' algorithm is presented in Paranyushkin (2019) **[InfraNodus — Generating Insight Using Text Network Analysis](http://bit.ly/infragitpdf)** (published in the [Proceedings for the WWW'19 The Web Conference](http://bit.ly/infragitacm)). If you use the tool, you can cite this paper.

A more easy-to-read article on the tool is published in **[Towards Data Science](https://towardsdatascience.com/measuring-discourse-bias-using-text-network-analysis-9f251be5f6f3)**.



=================


### Introduction

The basic ideas behind InfraNodus are:

- [Graph DB model](https://github.com/deemeetree/graphdbmodel) suitable for large graphs and collaboration.
- Represent text as a network of interconnected nodes.
- Works on desktop and mobile.
- Make it easy to add nodes into a graph through a simple web interface.
- Work with what people already know and use well: #hashtags and @mentions, not nodes and edges.
- Use natural language to enter nodes in a graph (English and Russian morphology is supported)
- Move away from binary edges (e.g. A < - > B) to hyperedges in one statement (e.g. A and B and C or D)
- API and JSON export of all data;
- Twitter, Evernote, Gmail, Google, YouTube subtitles, RSS import (TODO: gexf, xml, csv upload)
- Enable people to use ше collaboratively, both locally and over the internet
- Your suggestions? (open an issue)


=================


### Technology

InfraNodus is built on

* [Sigma.Js](http://github.com/jacomyal/sigma.js) for graph visualization;
* [Neo4J](http://neo4j.org) ver 3.x for graph database storage
* [Graphology](https://graphology.github.io/) for graph metrics calculations (Modularity)
* [JSNetworksX](http://jsnetworkx.org/) for graph metrics calculations (BC)
* [Cytoscape](https://github.com/cytoscape/cytoscape.js) for some graph metrics
* jQuery for the front-end
* Node.Js for the back-end
* Express Node.Js library;
* [Node-Neo4J layer](http://github.com/philippkueng/node-neo4j);
* [Textexture](http://textexture.com) algorithm for text network visualization;
* Open-source code from the people on StackOverflow and Neo4J community;


=================


### Installation Guide

#### Run directly on your machine
To use this software you should install Neo4J 3.0 on your local computer.
To install Neo4J on a Mac use homebrew (see [Neo4J instructions here](http://www.neo4j.org/download)).
For settings, check out [How to Set Up Neo4J for InfraNodus](https://github.com/noduslabs/infranodus/wiki/Neo4J-Database-Setup).
You may also find [other wiki pages](https://github.com/noduslabs/infranodus/wiki/_pages) interesting, especially [Neo4J installation guide](https://github.com/noduslabs/infranodus/wiki/Upgrading-Your-Neo4J-Database-from-2.x-to-3.x) – the section on setting up indexes and installing APOC plugin.

Git clone this project into a folder, then you will also need to have npm Node.Js package manager installed on your computer. After you install InfraNodus, run
`npm install`
in the main folder the project to install all the dependencies into `node_modules` folder.

Check out the config.json.sample file and edit it to add your own Evernote and Twitter API credentials. Then rename it to config.json.

Run the application with `node app.js`. You can access the app from http://localhost:3000

To sign up for an account, visit http://localhost:3000/signup?invitation=secretcode - replace `secretcode` with the value of `secrets.invitation` in your `config.json`.

#### Run inside a Vagrant Virtual Machine

1. `git clone` the project
2. `cd infranodus` to switch into the git project directory
3. `cp config.json.sample config.json` and modidy the file as necessary - for example, add Evernote and/or Twitter credentials. Note: if you change the Neo4j database password here, you'll also need to change it in your local copy of `/vagrant/setup-neo4j.sh`.
4. `vagrant up` in the project folder. This may take a while the first time, as it installs an Ubuntu VM and all dependencies.
5. `vagrant ssh` to logon to the Virtual Machine
6. `cd /vagrant` to get into the project directory on the Virtual machine
7. `node app.js` to run the application
8. You can access the app from http://192.168.66.101:3000 - if you want a different IP address, change the `ip` setting under `config.vm.network` in the `vagrantfile`.
9. To sign up for an account, visit http://192.168.66.101:3000/signup?invitation=secretcode - replace `secretcode` with the value of `secrets.invitation` in your `config.json`.

=================


### Data Model

The general rationale for the data model used in InfraNodus is outlined in
* [Cognitive Network Protocol](http://noduslabs.com/research/cognitive-network-protocol/) article (more specific)
* [From Cognitive Interfaces to Transcendental Protocols](http://noduslabs.com/research/cognitive-interfaces-transcendental-protocols/) article (more general)
* [Graph Database Model Draft](https://github.com/deemeetree/graphdbmodel) detailed description

The main properties of this model are

- There are 5 labels (types) for nodes: Concepts, Statements, Contexts, Users, and Narratives
- Every expression of a user into the system is a Statement
- Example: "#antibiotics can fight #bacteria which are #dangerous for #health" is the user's input. The system creates 4 :Concept nodes from the hashtags inside the :Statement, which is linked to the :Context (by default, "@private") and all those are attached to the :User.
- Types of connections: :TO (between Concepts), :AT (Concepts to Context), :OF (Concepts to Statement), :IN (Statement to Context), :BY (to User)
- Narrative is implemented through creating a :Narrative node, which is linked to from Statements and Concepts by :INTO type of connection (think of :Narrative as another :Context)
- Narrative elements are linked to each other via :THRU type of connection.

This data model enables to create custom views for any kind of data and introduce the idea of narrative into holistic graph views.

This data model is derived from the [Cognitive Graph DB Model](http://noduslabs.com/cases/graph-database-structure-specification/) draft created by Nodus Labs.

The current data model description utilized in InfraNodus app is available in https://github.com/noduslabs/graphdbmodel repository.


=================


### Mobile Interface

InfraNodus can also be used on a mobile.

![](/public/images/infranodus-mobile.png "InfraNodus Mobile Interface")



=================

### Python Port

Together with Mattias Östmar (who did most of the work) we created a port of InfraNodus in Python, focusing on the measure of network diversity structure that it provides.

You can get it in [DiscourseDiversity](https://gitlab.com/mattiasostmar/discoursediversity) repo on GitLab. We're still working on it, but if you like Jupyter notebooks and network analysis, there's some good stuff to find in there!

* [InfraNodus in Python](https://gitlab.com/mattiasostmar/discoursediversity)


=================


### Special Thanks

InfraNodus could not be built without the
* Help from the people on StackOverflow and Neo4J community;

Also... :)
* Special thanks to [Oleg Yarin](https://github.com/monapasan) for his support and to [Mattias Östmar](https://gitlab.com/mattiasostmar) for his energy and inspiration;



=================


### GPL License

This open source, free software is available under the GNU Affero General Public License version 3 (AGPLv3) license.
You can make modifications to this code and binaries based on it, but only on the condition that you provide access to those modifications under the same license (including remotely  through a computer network).
It is provided as is, with no guarantees and no liabilities.
You can re-use it as long as you keep this notice inside the code.

**You are very welcome to join the project!**

Created by Dmitry Paranyushkin of [Nodus Labs](http://www.noduslabs.com), conceptualized via [Polysingularity](http://polysingularity.com), inspired from [ThisIsLike.Com](http://thisislike.com), and [KnowNodes (now Rhizi)](http://rhizi.org) co-developed at [Center for Interdisciplinary Research](http://cri-paris.org).

This project would not be possible without the help from StackOverflow community. Thank you so much!

Copyright (C) [Dmitry Paranyushkin](http://github.com/deemeetree) | [Nodus Labs](http://www.noduslabs.com) and hopefully you also!
(http://www.noduslabs.com) | info AT noduslabs DOT com

In some parts the code from the book ["Node.js in Action"](http://www.manning.com/cantelon/) is used
(c) 2014 Manning Publications Co.
Any source code files provided as a supplement to the book are freely available to the public for download. Reuse of the code is permitted, in whole or in part, including the creation of derivative works, provided that you acknowledge that you are using it and identify the source: title, publisher and year.

Some parts of this code may come under a different license if specified within.
