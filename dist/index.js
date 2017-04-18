"use strict";
var angular_translate_plugin_1 = require("./angular-translate-plugin");
exports.Plugin = angular_translate_plugin_1.default;
function htmlLoader(before, options) {
    var loader = require.resolve("./html/html-loader");
    options = (options ? "?" + JSON.stringify(options) : "");
    if (before) {
        return loader + "!" + before + options;
    }
    return loader + options;
}
exports.htmlLoader = htmlLoader;
function jsLoader(before, options) {
    var loader = require.resolve("./js/js-loader");
    options = (options ? "?" + JSON.stringify(options) : "");
    if (before) {
        return loader + "!" + before + options;
    }
    return loader + options;
}
exports.jsLoader = jsLoader;
//# sourceMappingURL=index.js.map