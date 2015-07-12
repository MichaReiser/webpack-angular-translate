var walk = require('esprima-walk');

var OriginalSource = require('webpack/lib/OriginalSource');
var ConstDependency = require("webpack/lib/dependencies/ConstDependency");
var NullFactory = require("webpack/lib/NullFactory");

var Translation = require("./Translation");

function TranslationMergeError (existing, newTranslation) {
    this.message = "Webpack-Angular-Translate: Two translations with the same id but different default text found (" + existing + ", "
        + newTranslation + "). Please define the same default text twice or specify the default text only once.";
}

/**
 * Transforms an array of translations into an object hash where the id of the translation is used as key and the default
 * value is assigned to the value.
 * @param translations [Translation] the translations to convert
 * @returns {String:String} the object hash containing the translation id and the default text
 */
function toContent(translations) {
    var result = {};

    Object.keys(translations).forEach(function (translationId) {
        var translation = translations[translationId];
        result[translationId] = translation.defaultText || translation.id;
    });

    return JSON.stringify(result);
}

function AngularTranslatePlugin () {
    this.translations = {};
}


/**
 * Entry function from webpack that registers the plugin in the required-build-phases
 * @param compiler
 */
AngularTranslatePlugin.prototype.apply = function (compiler) {
    var self = this;
    this.compiler = compiler;

    compiler.plugin('compilation', function (compilation) {
        self.compilation = compilation;

        compilation.dependencyFactories.set(ConstDependency, new NullFactory());
        compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

        /**
         * Register the plugin to the normal-module-loader and expose the registerTranslation function in the loaderContext.
         * This way the loader can communicate with the plugin and pass the translations to the plugin.
         */
        compilation.plugin("normal-module-loader", function(loaderContext) {
            loaderContext.registerTranslation = self.registerTranslation.bind(self);
        });
    });


    compiler.plugin('emit', this.emitResult.bind(this));

    compiler.parser.plugin('program', function (ast) {
        var resource = compiler.parser.state.current.request;
        walk(ast, function (node) {
            if (node.type !== 'CallExpression') {
               return;
            }

            // $translate(...)
            if (node.callee.type === 'Identifier' && node.callee.name === '$translate') {
                self.handleCallExpression(node, resource);
            }

            // this.$translate(...), _this.$translate(...), x.$translate(..)
            if (node.callee.type === 'MemberExpression' && node.callee.property.name === '$translate') {
                self.handleCallExpression(node, resource);
            }
        });
    });

    compiler.parser.plugin('call i18n.registerTranslations', self.handleRegisterTranslations.bind(self));
    /*compiler.parser.plugin('expression i18n.registerTranslations', function (expr) {
        var dep = new ConstDependency("(0)", expr.range);
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
    });*/

    // this only works if Parser.js walkCallExpression is modified to trigger 'evaluate CallExpression').
    // This approach would have the advantage, that the arguments could be
    // evaluated with compiler.parser.evaluate(arg). This could resolve requires etc.
    // https://github.com/webpack/webpack/issues/1242
    // compiler.parser.plugin('can-rename $translate', function () { return true; });
    // compiler.parser.plugin('call $translate', self.handleCallExpression);
    // compiler.parser.plugin('evaluate CallExpression .$translate', self.handleCallExpression);
};

/**
 * Registers a new translation that should be included in the output
 * @param translation {Translation} the translation to register
 */
AngularTranslatePlugin.prototype.registerTranslation = function (translation) {
    var existingEntry = this.translations[translation.id];

    // If both entries define a default text that doesn't match, emit an error
    if (existingEntry && existingEntry.defaultText !== translation.defaultText && existingEntry.defaultText && translation.defaultText) {
        this.compilation.errors.push(new TranslationMergeError(existingEntry, translation));
    } else {
        this.translations[translation.id] = existingEntry ? translation.merge(existingEntry) : translation;
    }
};

/**
 * When the compilation is complete, merge all the translations and emit the translations into the translations.js
 */
AngularTranslatePlugin.prototype.emitResult = function (compilation, callback) {
    var content = toContent(this.translations);
    compilation.assets["translations.js"] = new OriginalSource(content, "translations");
    callback();
};

AngularTranslatePlugin.prototype.handleCallExpression = function (expression, resource) {
    if (expression.arguments.length < 1) {
        this.compilation.warnings.push(new Error("A call to $translate requires at least one argument (" + resource + ":" + expression.loc.start.line + ")."));
        return;
    }

    var translationIds = this.extractArgumentValue(expression.arguments[0]);
    if (!Array.isArray(translationIds)) {
        translationIds = [ translationIds ];
    }

    var defaultText = expression.arguments.length > 3 ? this.extractArgumentValue(expression.arguments[3]) : undefined;
    var translations = translationIds.map(function (translationId) {
        return new Translation(translationId, defaultText, resource);
    });

    translations.forEach(this.registerTranslation.bind(this));
};

AngularTranslatePlugin.prototype.handleRegisterTranslations = function (call) {
    var translations;

    if (call.arguments[0].type === 'ObjectExpression') {
        translations = call.arguments[0].properties.map(function (property) {
            return new Translation(property.key.value, property.value.value);
        });

    } else if (call.arguments[0].type === 'Literal') {
        translations = [ new Translation(call.arguments[0].value, call.arguments[1].value) ];
    }

    translations.forEach(this.registerTranslation.bind(this));

    // Replace the registerTranslations expression with a pseudo expression
    // This expression will be removed by UglifyJS!
    var dep = new ConstDependency("(0)", call.range);
    dep.loc = call.loc;
    this.compiler.parser.state.current.addDependency(dep);
    return true;
};

AngularTranslatePlugin.prototype.extractArgumentValue = function(argument) {
    if (argument.type === 'Literal') {
        return argument.value;
    }

    if (argument.type === 'ArrayExpression') {
        return argument.elements.map(this.extractArgumentValue.bind(this));
    }
};

module.exports = AngularTranslatePlugin;