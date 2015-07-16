var assert = require("chai").assert,
    webpack = require('webpack'),
    deepExtend = require('deep-extend'),
    WebPackAngularTranslate = require("../index.js");

/**
 * Helper function to implement tests that verify the result in the translations.js
 * @param fileName {string} the filename of the input file (the file to process by webpack)
 * @param doneCallback the done callback from mocha that is invoked when the test has completed
 * @param assertCallback {function({}, {})} Callback that contains the assert statements. the first argument
 * is the source of the translations file. The webpack stats (containing warnings and errors) is passed as second argument.
 */
function translationsTest(fileName, doneCallback, assertCallback) {
    compile({
        entry: [ './test/cases/' + fileName ]
    }, function (error, stats) {
        if (error) {
            assert.fail(null, error);
            doneCallback();
        }

        var translations = undefined;
        if (stats.compilation.assets["translations.json"]) {
            translations = JSON.parse(stats.compilation.assets["translations.json"].source());
        }

        assert.property(stats.compilation.assets, "translations.json");
        assertCallback(translations, stats);

        doneCallback();
    });
}

function compile(options, callback) {
    options = deepExtend({
        output: {
            path: __dirname + "/dist"
        },
        module: {
            loaders: [
                {
                    test: /\.html$/,
                    loader: 'html?removeEmptyAttributes=false'
                }
            ],
            preLoaders: [
                {
                    test: /\.html$/,
                    loader: WebPackAngularTranslate.loader()
                }
            ]
        },

        plugins: [
            new WebPackAngularTranslate.Plugin(),
        ]
    }, options);


    var compiler = webpack(options);
    compiler.run(callback);
}

describe("directive", function () {
    "use strict";

    it("extracts the translation id if translate is used as attribute", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-translation', 'attribute-translation');
        });
    });

    it("extracts the translation id if translate is used as element", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'element-translation', 'element-translation');
        });
    });

    it("extracts the translation id from the attribute if specified", function (done) {
        translationsTest('simple.html', done, function (translations) {
            assert.propertyVal(translations, 'id-in-attribute', 'id-in-attribute');
        });
    });

    it("extracts the default text if translate is used as attribute", function (done) {
        translationsTest('defaultText.html', done, function (translations) {
            assert.propertyVal(translations, 'Login', 'Anmelden');
        });
    });

    it("extracts the default text if translate is used as element", function (done) {
        translationsTest('defaultText.html', done, function (translations) {
            assert.propertyVal(translations, 'Logout', 'Abmelden');
        });
    });

    it("extracts the translation id if a translation for an attribute is defined", function (done) {
        translationsTest('attributes.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-id', 'attribute-id');
        });
    });

    it("extracts the default text for an attribute translation", function (done) {
        translationsTest('attributes.html', done, function (translations) {
            assert.propertyVal(translations, 'attribute-default-id', 'Default text for attribute title');
        });
    });

    it("emits a error if an angular expression is used as attribute id", function (done) {
        translationsTest('expressions.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, 'an error should have been emitted for the used angular expression as attribute id');

            var error = stats.compilation.errors[0];
            assert.include(error.message, "expressions.html uses an angular expression as translation id ({{editCtrl.title}}) or as default text (undefined), this is not supported. To suppress this error attribute the element or any parent attribute with suppress-dynamic-translation-error.");
        });
    });

    it("does suppress errors for dynamic translations if the element is attributed with suppress-dynamic-translation-error", function (done) {
        translationsTest('expressions-suppressed.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 0, "The dynamic translation error is suppressed by the attribute suppress-dynamic-translation-error");
            assert.deepEqual(translations, {});
        });
    });

    it("removes the suppress-dynamic-translation-error attribute for non dev build", function (done) {
        translationsTest('expressions-suppressed.html', done, function (translations, stats) {
            var output = stats.compilation.assets["bundle.js"].source();

            assert.notInclude(output, 'suppress-dynamic-translation-error');
        });
    });
});

describe("filter", function () {

    it("matches a filter in the body of an element", function (done) {
        translationsTest('filter-simple.html', done, function (translations) {
            assert.propertyVal(translations, 'Home', 'Home');
        });
    });

    it("matches a filter in an attribute of an element", function (done) {
        translationsTest('filter-simple.html', done, function (translations) {
            assert.propertyVal(translations, 'Waterfall', 'Waterfall');
        });
    });

    it("matches an expression in the middle of the element text content", function (done) {
        translationsTest('filter-simple.html', done, function (translations) {
            assert.propertyVal(translations, 'Top', 'Top');
        });
    });

    it("matches multiple expressions in a single text", function (done) {
        translationsTest('multiple-filters.html', done, function (translations) {
            assert.propertyVal(translations, 'Result', 'Result');
            assert.propertyVal(translations, 'of', 'of');
        });
    });

    it("emits an error if a dynamic value is used in the translate filter", function (done) {
        translationsTest('dynamic-filter-expression.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, 'the loader should emit an error message for the dynamic translation');

            assert.include(stats.compilation.errors[0].message, "dynamic-filter-expression.html in the text or an attribute of the element <h1 id='top'>{{ editCtrl.title | translate }}</h1>.");
            assert.deepEqual({}, translations);
        });
    });

    it("emits an error if a filter is used before the translate filter", function (done) {
        translationsTest('filter-chain.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, 'the loader should emit an error message for filter chains where translate is not the first filter');

            assert.include(stats.compilation.errors[0].message, 'Another filter is used before the translate filter in the element <h1 id=\'top\'>{{ "5.0" | currency | translate }}</h1>');
            assert.deepEqual({}, translations);
        });
    });

    it("suppress dynamic translations errors if element or parent is attribute with suppress-dynamic-translation-error", function (done) {
        translationsTest('dynamic-filter-expression-suppressed.html', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 0);
        });
    });

    it("suppress dynamic translations errors for custom elements when attributed with suppress-dynamic-translation-error", function (done) {
        translationsTest('dynamic-filter-custom-element.html', done, function (translations, stats) {
            assert.deepEqual(stats.compilation.errors, []);
        });
    });

    it("can parse an invalid html file", function (done) {
        translationsTest('invalid-html.html', done, function (translations) {
            assert.propertyVal(translations, 'Result', 'Result');
        });
    });
});

describe("JS", function () {
    "use strict";

    it("extracts the translation id when the $translate service is used as global variable ($translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, 'global variable', 'global variable');
        });
    });

    it("extracts the translation id when the $translate service is used in the constructor", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "translate in constructor", "translate in constructor");
        });
    });

    it("extracts the translation id when the $translate service is used in an arrow function (() => this.$translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "translate in arrow function", "translate in arrow function");
        });
    });

    it("extracts the translation id when the $translate service is used in a member function (this.$translate)", function (done) {
        translationsTest('simple.js', done, function (translations) {
            assert.propertyVal(translations, "this-translate", "this-translate");
        });
    });

    it("extracts multiple translation id's when an array is passed as argument", function (done) {
        translationsTest('array.js', done, function (translations) {
            assert.propertyVal(translations, 'FIRST_PAGE', 'FIRST_PAGE');
            assert.propertyVal(translations, 'Next', 'Next');
        });
    });

    it("extracts the default text", function (done) {
        translationsTest('defaultText.js', done, function (translations) {
            assert.propertyVal(translations, 'Next', 'Weiter');
        });
    });

    it("extracts the default text when an array is passed for the id's", function (done) {
        translationsTest('defaultText.js', done, function (translations) {
            assert.propertyVal(translations, 'FIRST_PAGE', 'Missing');
            assert.propertyVal(translations, 'LAST_PAGE', 'Missing');
        });
    });
});

describe("Register translation", function () {
    it("register translation", function (done) {
        translationsTest('registerTranslation.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 0);

            assert.deepEqual(translations, {
                "NEW_USER": "New user",
                "EDIT_USER": "Edit user"
            });
        });
    });

    it("register translation with invalid arguments", function (done) {
        translationsTest('registerInvalidTranslation.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 2);

            assert.match(stats.compilation.errors[0].message, /^A call to i18n\.registerTranslation\(id, defaultText\) requires at least one argument \(.+registerInvalidTranslation\.js:2\)/);
            assert.match(stats.compilation.errors[1].message, /^Invalid call to i18n\.registerTranslation \(only string arguments are supported, could not evaluate expression, .+registerInvalidTranslation\.js:4\)\./);

            assert.deepEqual(translations, {});
        });
    });
});

describe("Register translations", function () {
    it("register translations", function (done) {
        translationsTest('registerTranslations.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 0);

            assert.deepEqual(translations, {
                "Login": "Anmelden",
                "Logout": "Abmelden",
                "Next": "Weiter",
                "Back": "Zurück"
            });
        });
    });

    it("warns about invalid translation registrations", function (done) {
        translationsTest('registerInvalidTranslations.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 2);

            assert.match(stats.compilation.errors[0].message, /^A call to i18n\.registerTranslations\(\{}\) requires at least one argument that is an object\(.+registerInvalidTranslations\.js:1\)$/);
            assert.match(stats.compilation.errors[1].message, /^The default text \(value\) must be a string literal \(.+registerInvalidTranslations\.js:6\)\.$/);
            assert.deepEqual(translations, {});
        });
    });
});

describe("Common", function () {
    it("emits an error if the same id with different default texts is used", function (done) {
        translationsTest('differentDefaultTexts.js', done, function (translations, stats) {
            assert.lengthOf(stats.compilation.errors, 1, "An error should be emitted if two id's have a different default text");

            var error = stats.compilation.errors[0];
            assert.match(error.message, /^Webpack-Angular-Translate: Two translations with the same id but different default text found \(Translation\{ id: Next, defaultText: Weiter, resources: .+differentDefaultTexts\.js}, Translation\{ id: Next, defaultText: Missing, resources: .+differentDefaultTexts.js}\)\. Please define the same default text twice or specify the default text only once\.$/);

            assert.deepEqual(translations, { "Next": "Weiter"}); // First match wins
        });
    });
});