var Plugin = require('./plugin');


function loader(options) {
    return require.resolve("./loader") + (options ? "?" + JSON.stringify(options) : "");
}

module.exports = { Plugin : Plugin, loader: loader };
