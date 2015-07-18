var Plugin = require('./lib/plugin');


function htmlLoader(before, options) {
    var loader = require.resolve("./lib/htmlLoader"),
        options = (options ? "?" + JSON.stringify(options) : "");
    if (before) {
        return loader + "!" + before + options;
    }
    return loader + options;
}

function jsLoader(before, options) {
    var loader = require.resolve("./lib/jsLoader"),
        options = (options ? "?" + JSON.stringify(options) : "");

    if (before) {
        return loader + "!" + before + options;
    }

    return loader + options;
}

module.exports = { Plugin : Plugin, htmlLoader: htmlLoader, jsLoader: jsLoader };
