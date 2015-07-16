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

    return JSON.stringify(result, null, '\t');
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

    compiler.parser.plugin('call i18n.registerTranslation', self.handleRegisterTranslation.bind(self));
    compiler.parser.plugin('call i18n.registerTranslations', self.handleRegisterTranslations.bind(self));

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
    compilation.assets["translations.json"] = new OriginalSource(content, "translations");
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

AngularTranslatePlugin.prototype.handleRegisterTranslation = function (call) {
    var resource = this.compiler.parser.state.current.request;
    if (call.arguments.length === 0) {
        this.compilation.errors.push(new Error("A call to i18n.registerTranslation(id, defaultText) requires at least one argument (" + resource + ":" + call.loc.start.line + ")"));
        return;
    }

    try {
        var translationId = evaluateStringArgument(call.arguments[0], this.compiler),
            defaultText;

        if (call.arguments.length > 1) {
            defaultText = evaluateStringArgument(call.arguments[1], this.compiler);
        }
        var translation = new Translation(translationId, defaultText, resource);

        this.registerTranslation(translation);

        // Replace the registerTranslation expression with the translation id
        var dep = new ConstDependency('"' + translation.id + '"', call.range);
        dep.loc = call.loc;
        this.compiler.parser.state.current.addDependency(dep);
        return true;
    } catch (e) {
        this.compilation.errors.push(new Error("Invalid call to i18n.registerTranslation (" + e.message + ", " + resource + ":" + call.loc.start.line + ")."));
    }
};
AngularTranslatePlugin.prototype.handleRegisterTranslations = function (call) {
    var self = this;
    var resource = this.compiler.parser.state.current.request;
    if (call.arguments.length === 0 || call.arguments[0].type !== 'ObjectExpression') {
        this.compilation.errors.push(new Error("A call to i18n.registerTranslations({}) requires at least one argument that is an object(" + resource + ":" + call.loc.start.line + ")"));
        return;
    }

    try {
        var translations = call.arguments[0].properties.map(function (property) {
            var translationId;

            if (property.key.type === 'Identifier') {
                translationId = property.key.name;
            } else {
                translationId = self.compiler.parser.evaluateExpression(property.key).string;
            }

            var defaultText = self.compiler.parser.evaluateExpression(property.value);

            if (!defaultText.isString()) {
                throw new Error("The default text (value) must be a string literal (" + resource + ":" + property.value.loc.start.line + ").");
            }
            return new Translation(translationId, defaultText.string, resource);
        });

        translations.forEach(this.registerTranslation.bind(this));

        // Replace the registerTranslation expression with a pseudo expression that is removed by uglify js
        var dep = new ConstDependency('(0)', call.range);
        dep.loc = call.loc;
        this.compiler.parser.state.current.addDependency(dep);
        return true;

    } catch (e) {
        this.compilation.errors.push(e);
    }
};


AngularTranslatePlugin.prototype.extractArgumentValue = function(argument) {
    var evaluated = this.compiler.parser.evaluateExpression(argument);
    if (evaluated.isString()) {
        return evaluated.string;
    }

    if (evaluated.isArray()) {
        return evaluated.items.map(function (item) { return item.string; });
    }
};

function evaluateStringArgument(argument, compiler) {
    var evaluated = compiler.parser.evaluateExpression(argument);
    if (evaluated.isString()) {
        return evaluated.string;
    }

    throw new Error("only string arguments are supported, could not evaluate expression");
}

module.exports = AngularTranslatePlugin;