'use strict';

module.exports = function (userConfig) {
    this.tagTypes = ["adj", "adv", "art", "con", "nom", "ono", "pre", "ver", "pro"];
    this.strictness = false;
    this.perfLog = false;
    this.debug = false;
    this.minimumLength = 1;
    if (userConfig) {
        this.tagTypes = userConfig.tagTypes || this.tagTypes;
        this.strictness = userConfig.strictness || this.strictness;
        this.perfLog = userConfig.perfLog || this.perfLog;
        this.debug = userConfig.debug || this.debug;
        this.minimumLength = userConfig.minimumLength || this.minimumLength;
    }
};
