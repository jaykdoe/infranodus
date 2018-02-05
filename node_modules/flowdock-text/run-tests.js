"use strict";

// will bind it self to global
require("./flowdock-text.js");

global.cases = require("./test/conformance.js");
global.testers = require("./test/testers.js");
global.chai = require("chai");

// run tests
require("./test/tests.js");
