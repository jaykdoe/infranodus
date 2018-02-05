# flowdock-text

Flowdock-text is a javascript utility for extracting and linkifying hashtags and URLs in Flowdock. It is built upon Twitter's [twitter-text-js](https://github.com/twitter/twitter-text-js). Some twitter-text's functionality has been removed or altered.

## Usage
### Extraction

Hashtag extraction

```javascript
FlowdockText.extractHashtags("hello #world");
[ 'world' ]
FlowdockText.extractHashtagsWithIndices("hello #world");
[ { tag: 'world', indices: [ 6, 12 ] } ]
```

Usertag extraction

```javascript
FlowdockText.extractMentions("hello @Username");
[ '@Username' ]
FlowdockText.extractMentionsWithIndices("hello @Username");
[ { tag: '@Username', indices: [ 6, 15 ] } ]
```

URL extraction

```javascript
FlowdockText.extractUrls("hello http://www.example.com");
[ 'http://www.example.com' ]
FlowdockText.extractUrlsWithIndices("hello http://www.example.com");
[ { url: 'http://www.example.com', indices: [ 6, 28 ] } ]
```

### Linkification

```javascript
FlowdockText.autoLink("hello @Username #greets");
'hello <a title="Search @Username" class="app-tag-link" href="#flowser/all/@Username">@Username</a> <a href="#flowser/all/greets" title="#greets" class="app-tag-link">#greets</a>'
```

## NPM

Install with: `npm install flowdock-text`

```javascript
var FlowdockText = require("flowdock-text");
FlowdockText.extractUrlsWithIndices("cool http://www.example.com");
[ { url: 'http://www.example.com', indices: [ 6, 28 ] } ]
```

## Tests

[![Build Status](https://secure.travis-ci.org/flowdock/flowdock-text.png?branch=master)](http://travis-ci.org/flowdock/flowdock-text)

Tests can be run in browsers or with node.js

To run the tests in your default browser:

    rake test

To run the tests with node.js

    rake test_node

### mocha, istanbul & karma

You can run tests with [mocha](http://visionmedia.github.io/mocha/):

    npm run test

Optionally you can get coverage information with [istanbul](http://gotwarlost.github.io/istanbul/):

    npm run istanbul

And finally, you could run test suite in multiple browsers using [karma](http://karma-runner.github.io/0.10/index.html)

    npm run karma

For those to work you have to install related npm packages:

    npm install

For convenience, there are npm scripts

## Copyright and License

Copyright 2011 Twitter, Inc.

Copyright 2011 Flowdock Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this work except in compliance with the License.
You may obtain a copy of the License in the LICENSE file, or at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
