'use strict';

module.exports = function (config) {

    this.debugConfig = config.debug;
    this.perfLogConfig = config.perfLog;

    this.debug = function (message, object) {
        if (this.debugConfig === true) {
            console.log('\x1b[35m%s\x1b[0m', message, JSON.stringify(object, null, 1));
        }
    }

    this.perf = function (message) {
        if (this.perfLogConfig === true) {
            console.log(message);
        }
    }
}
