const assert = require("chai").assert;
const webpack = require("webpack");
const deepExtend = require("deep-extend");
const WebPackAngularTranslate = require("../dist/index.js");
const { Volume, createFsFromVolume } = require("memfs");
const { ufs } = require("unionfs");
const path = require("path");
const fs = require("fs");

/**
 * Helper function to implement tests that verify the result in the translations.js
 * @param fileName {string} the filename of the input file (the file to process by webpack)
 * @param doneCallback the done callback from mocha that is invoked when the test has completed
 * @param assertCallback {function({}, {})} Callback that contains the assert statements. the first argument
 * is the source of the translations file. The webpack stats (containing warnings and errors) is passed as second argument.
 */
async function compileAndGetTranslations(fileName) {
  var options = webpackOptions({
    entry: ["./test/cases/" + fileName]
  });

  const { error, stats, volume } = await compile(options);
  assert.notOk(error, JSON.stringify(error));

  var translations = {};
  if (stats.compilation.assets["translations.json"]) {
    translations = JSON.parse(
      volume.toJSON(__dirname, undefined, true)["dist/translations.json"]
    );
  }

  return { translations, stats };
}

function webpackOptions(options) {
  "use strict";
  return deepExtend(
    {
      output: {
        path: path.join(__dirname, "dist")
      },
      mode: "production",
      module: {
        rules: [
          {
            test: /\.html$/,
            use: [
              {
                loader: "html-loader",
                options: {
                  removeEmptyAttributes: false,
                  attrs: []
                }
              },
              {
                loader: WebPackAngularTranslate.htmlLoader()
              }
            ]
          },
          {
            test: /\.js/,
            loader: WebPackAngularTranslate.jsLoader()
          }
        ]
      },

      plugins: [new WebPackAngularTranslate.Plugin()]
    },
    options
  );
}

function compile(options) {
  var compiler = webpack(options);
  var volume = new Volume();
  compiler.outputFileSystem = new VolumeOutputFileSystem(volume);

  return new Promise((resolve, reject) => {
    compiler.run(function(error, stats) {
      resolve({ error, stats, volume });
    });
  });
}

describe("HTML Loader", function() {
  "use strict";

  it("emits a useful error message if the plugin is missing", async function() {
    const { error, stats } = await compile({
      entry: "./test/cases/simple.html",
      output: {
        path: path.join(__dirname, "dist")
      },
      module: {
        rules: [
          {
            test: /\.html$/,
            use: [
              {
                loader: "html-loader",
                options: {
                  removeEmptyAttributes: false,
                  attrs: []
                }
              },
              {
                loader: WebPackAngularTranslate.htmlLoader()
              }
            ]
          },
          {
            test: /\.js/,
            loader: WebPackAngularTranslate.jsLoader()
          }
        ]
      }
    });

    assert.isNull(error);
    assert.equal(stats.compilation.errors.length, 1);
    assert.include(
      stats.compilation.errors[0].message,
      "Module build failed (from ./dist/html/html-loader.js):\nError: The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section."
    );
  });

  describe("directive", function() {
    "use strict";

    it("extracts the translation id if translate is used as attribute", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");

      assert.propertyVal(
        translations,
        "attribute-translation",
        "attribute-translation"
      );
    });

    it("extracts the translation id if translate is used as element", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");
      assert.propertyVal(
        translations,
        "element-translation",
        "element-translation"
      );
    });

    it("extracts the translation id from the attribute if specified", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");
      assert.propertyVal(translations, "id-in-attribute", "id-in-attribute");
    });

    it("extracts the default text if translate is used as attribute", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.html"
      );
      assert.propertyVal(translations, "Login", "Anmelden");
    });

    it("extracts the default text if translate is used as element", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.html"
      );
      assert.propertyVal(translations, "Logout", "Abmelden");
    });

    it("extracts the translation id if a translation for an attribute is defined", async function() {
      const { translations } = await compileAndGetTranslations(
        "attributes.html"
      );
      assert.propertyVal(translations, "attribute-id", "attribute-id");
    });

    it("extracts the default text for an attribute translation", async function() {
      const { translations } = await compileAndGetTranslations(
        "attributes.html"
      );
      assert.propertyVal(
        translations,
        "attribute-default-id",
        "Default text for attribute title"
      );
    });

    it("emits an error if an angular expression is used as attribute id", async function() {
      const { stats } = await compileAndGetTranslations("expressions.html");
      assert.lengthOf(
        stats.compilation.errors,
        1,
        "an error should have been emitted for the used angular expression as attribute id"
      );

      var error = stats.compilation.errors[0];
      assert.include(
        error.message,
        "expressions.html' uses an angular expression as translation id ('{{editCtrl.title}}') or as default text ('undefined'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
      );
    });

    it("does suppress errors for dynamic translations if the element is attributed with suppress-dynamic-translation-error", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "expressions-suppressed.html"
      );
      assert.lengthOf(
        stats.compilation.errors,
        0,
        "The dynamic translation error is suppressed by the attribute suppress-dynamic-translation-error"
      );
      assert.deepEqual(translations, {});
    });

    it("removes the suppress-dynamic-translation-error attribute for non dev build", async function() {
      const { stats } = await compileAndGetTranslations(
        "expressions-suppressed.html"
      );
      var output = stats.compilation.assets["main.js"].source();

      assert.include(output, "{{editCtrl.title}}");
      assert.notInclude(output, "suppress-dynamic-translation-error");
    });
  });

  describe("filter", function() {
    it("matches a filter in the body of an element", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      assert.propertyVal(translations, "Home", "Home");
    });

    it("matches a filter in an attribute of an element", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      assert.propertyVal(translations, "Waterfall", "Waterfall");
    });

    it("matches an expression in the middle of the element text content", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      assert.propertyVal(translations, "Top", "Top");
    });

    it("matches multiple expressions in a single text", async function() {
      const { translations } = await compileAndGetTranslations(
        "multiple-filters.html"
      );
      assert.propertyVal(translations, "Result", "Result");
      assert.propertyVal(translations, "of", "of");
    });

    it("emits an error if a dynamic value is used in the translate filter", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "dynamic-filter-expression.html"
      );
      assert.lengthOf(
        stats.compilation.errors,
        1,
        "the loader should emit an error message for the dynamic translation"
      );

      assert.include(
        stats.compilation.errors[0].message,
        "dynamic-filter-expression.html:8:14: A dynamic filter expression is used in the text or an attribute of the element '<h1 id='top'>{{ editCtrl.title | translate }}</h1>'. Add the 'suppress-dynamic-translation-error' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation)."
      );
      assert.deepEqual({}, translations);
    });

    it("emits an error if a filter is used before the translate filter", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "filter-chain.html"
      );
      assert.lengthOf(
        stats.compilation.errors,
        1,
        "the loader should emit an error message for filter chains where translate is not the first filter"
      );

      assert.include(
        stats.compilation.errors[0].message,
        "Another filter is used before the translate filter in the element <h1 id='top'>{{ \"5.0\" | currency | translate }}</h1>"
      );
      assert.deepEqual({}, translations);
    });

    it("suppress dynamic translations errors if element or parent is attribute with suppress-dynamic-translation-error", async function() {
      const { stats } = await compileAndGetTranslations(
        "dynamic-filter-expression-suppressed.html"
      );
      assert.lengthOf(stats.compilation.errors, 0);
    });

    it("suppress dynamic translations errors for custom elements when attributed with suppress-dynamic-translation-error", async function() {
      const { stats } = await compileAndGetTranslations(
        "dynamic-filter-custom-element.html"
      );
      assert.deepEqual(stats.compilation.errors, []);
    });

    it("can parse an invalid html file", async function() {
      const { translations } = await compileAndGetTranslations(
        "invalid-html.html"
      );
      assert.propertyVal(translations, "Result", "Result");
    });

    it("can parse an html containing an attribute that starts with a $", async function() {
      const { translations } = await compileAndGetTranslations(
        "html-with-dollar-attribute.html"
      );
      assert.propertyVal(translations, "Test", "Test");
    });
  });
});

describe("JSLoader", function() {
  "use strict";

  it("emits a useful error message if the plugin is missing", async function() {
    const { error, stats } = await compile({
      entry: "./test/cases/simple.js",
      output: {
        path: path.join(__dirname, "dist")
      },
      module: {
        rules: [
          {
            test: /\.js/,
            loader: WebPackAngularTranslate.jsLoader()
          }
        ]
      }
    });

    assert.isNull(error);
    assert.equal(stats.compilation.errors.length, 1);
    assert.include(
      stats.compilation.errors[0].message,
      `Module build failed (from ./dist/js/js-loader.js):
Error: The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section.`
    );
  });

  it("passes the acorn parser options to acorn (in this case, allows modules)", async function() {
    const { error, stats } = await compile({
      entry: "./test/cases/es-module.js",
      output: {
        path: path.join(__dirname, "dist")
      },
      module: {
        rules: [
          {
            test: /\.js/,
            loader: WebPackAngularTranslate.jsLoader(),
            options: {
              parserOptions: {
                sourceType: "module"
              }
            }
          }
        ]
      },
      plugins: [new WebPackAngularTranslate.Plugin()]
    });
    assert.isNull(error);
    assert.deepEqual(stats.compilation.errors, []);
  });

  describe("$translate", function() {
    it("extracts the translation id when the $translate service is used as global variable ($translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      assert.propertyVal(translations, "global variable", "global variable");
    });

    it("extracts the translation id when the $translate service is used in the constructor", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      assert.propertyVal(
        translations,
        "translate in constructor",
        "translate in constructor"
      );
    });

    it("extracts the translation id when the $translate service is used in an arrow function (() => this.$translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      assert.propertyVal(
        translations,
        "translate in arrow function",
        "translate in arrow function"
      );
    });

    it("extracts the translation id when the $translate service is used in a member function (this.$translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      assert.propertyVal(translations, "this-translate", "this-translate");
    });

    it("extracts multiple translation id's when an array is passed as argument", async function() {
      const { translations } = await compileAndGetTranslations("array.js");
      assert.propertyVal(translations, "FIRST_PAGE", "FIRST_PAGE");
      assert.propertyVal(translations, "Next", "Next");
    });

    it("extracts instant translation id", async function() {
      const { translations } = await compileAndGetTranslations("instant.js");
      assert.propertyVal(
        translations,
        "FIRST_TRANSLATION",
        "FIRST_TRANSLATION"
      );
      assert.propertyVal(
        translations,
        "SECOND_TRANSLATION",
        "SECOND_TRANSLATION"
      );
      assert.notProperty(translations, "SKIPPED_TRANSLATION");
    });

    it("extracts the default text", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.js"
      );
      assert.propertyVal(translations, "Next", "Weiter");
    });

    it("extracts the default text when an array is passed for the id's", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.js"
      );
      assert.propertyVal(translations, "FIRST_PAGE", "Missing");
      assert.propertyVal(translations, "LAST_PAGE", "Missing");
    });

    it("emits errors if $translate is used with invalid arguments", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "invalid$translate.js"
      );
      assert.lengthOf(stats.compilation.errors, 2);

      assert.include(
        stats.compilation.errors[0].message,
        "A call to $translate requires at least one argument "
      );
      assert.include(
        stats.compilation.errors[1].message,
        "Illegal argument for call to $translate: The translation id should either be a string literal or an array containing string literals. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error."
      );

      assert.deepEqual(translations, {});
    });

    it("a comment suppress the dynamic translation errors for $translate", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "translateSuppressed.js"
      );
      assert.lengthOf(stats.compilation.errors, 1);

      assert.deepEqual(translations, {});
      assert.include(
        stats.compilation.errors[0].message,
        "Illegal argument for call to $translate: The translation id should either be a string literal or an array containing string literals"
      );
    });
  });

  describe("i18n.registerTranslation", function() {
    it("register translation", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerTranslation.js"
      );
      assert.lengthOf(stats.compilation.errors, 0);

      assert.deepEqual(translations, {
        NEW_USER: "New user",
        EDIT_USER: "Edit user",
        "5": "true"
      });
    });

    it("register translation with invalid arguments", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerInvalidTranslation.js"
      );
      assert.lengthOf(stats.compilation.errors, 2);

      assert.include(
        stats.compilation.errors[0].message,
        "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal"
      );
      assert.include(
        stats.compilation.errors[1].message,
        "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal"
      );

      assert.deepEqual(translations, {});
    });
  });

  describe("i18n.registerTranslations", function() {
    it("register translations", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerTranslations.js"
      );
      assert.deepEqual(stats.compilation.errors, []);

      assert.deepEqual(translations, {
        Login: "Anmelden",
        Logout: "Abmelden",
        Next: "Weiter",
        Back: "Zurück"
      });
    });

    it("warns about invalid translation registrations", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerInvalidTranslations.js"
      );
      assert.lengthOf(stats.compilation.errors, 2);

      assert.include(
        stats.compilation.errors[0].message,
        `Module Error (from ./dist/js/js-loader.js):
Illegal argument for call to i18n.registerTranslations: The value for the key 'key' needs to be a literal`
      );
      assert.include(
        stats.compilation.errors[1].message,
        `Module Error (from ./dist/js/js-loader.js):
Illegal argument for call to i18n.registerTranslations: requires a single argument that is an object where the key is the translationId and the value is the default text`
      );
      assert.deepEqual(translations, {});
    });
  });
});

describe("Plugin", function() {
  it("emits an error if the same id with different default texts is used", async function() {
    const { translations, stats } = await compileAndGetTranslations(
      "differentDefaultTexts.js"
    );
    assert.lengthOf(
      stats.compilation.errors,
      1,
      "An error should be emitted if two id's have a different default text"
    );

    var error = stats.compilation.errors[0];
    assert.match(
      error.message,
      /^Webpack-Angular-Translate: Two translations with the same id but different default text found\.\n\tExisting: \{ id: 'Next', defaultText: 'Weiter', usages: \[ .+differentDefaultTexts\.js:5:8 ] }\n\tnew: \{ id: 'Next', defaultText: 'Missing', usages: \[ .+differentDefaultTexts.js:6:8 ] }\n\tPlease define the same default text twice or specify the default text only once\.$/
    );

    assert.deepEqual(translations, {});
  });

  it("emits a warning if the translation id is missing", async function() {
    const { translations, stats } = await compileAndGetTranslations(
      "emptyTranslate.html"
    );
    assert.lengthOf(
      stats.compilation.warnings,
      1,
      "A warning should have been emitted if a translation is used with an empty translation id"
    );

    var warning = stats.compilation.warnings[0];
    assert.match(
      warning.message,
      /^Invalid angular-translate translation '\{ id: '', defaultText: 'undefined', usages: \[ .+\/test\/cases\/emptyTranslate.html:5:8 ] }' found\. The id of the translation is empty, consider removing the translate attribute \(html\) or defining the translation id \(js\)\.$/
    );

    assert.deepEqual(translations, {});
  });

  it("does not add translations twice if file is recompiled after change", function(done) {
    const projectVolume = Volume.fromJSON(
      {
        "./fileChange.js":
          "require('./otherFile.js');\n" +
          "i18n.registerTranslation('NEW_USER', 'New user');\n" +
          "i18n.registerTranslation('DELETE_USER', 'Delete User');\n" +
          "i18n.registerTranslation('WillBeDeleted', 'Delete');",

        "./otherFile.js":
          "i18n.registerTranslation('DELETE_USER', 'Delete User');"
      },
      path.join(__dirname, "..")
    );
    const inputFs = ufs.use(fs).use(createFsFromVolume(projectVolume));
    const outputVolume = Volume.fromJSON({}, __dirname);

    var options = webpackOptions({
      entry: "./fileChange.js"
    });
    var compiler = webpack(options);
    compiler.inputFileSystem = inputFs;
    compiler.outputFileSystem = new VolumeOutputFileSystem(outputVolume);

    var firstRun = true;
    var watching = compiler.watch({}, function(error, stats) {
      "use strict";

      assert.notOk(error, "Failed to compile the assets");

      if (firstRun) {
        assert.deepEqual(
          stats.compilation.errors,
          [],
          "First compilation failed with errors"
        );

        firstRun = false;
        projectVolume.writeFileSync(
          "./fileChange.js",
          "i18n.registerTranslation('NEW_USER', 'Neuer Benutzer');"
        );
        watching.invalidate(); // watch doesn't seem to work with memory fs
      } else {
        assert.deepEqual(
          stats.compilation.errors,
          [],
          "The implementation should not emit duplicate translation errors after recompilation with different text."
        );

        var translations = JSON.parse(
          outputVolume.toJSON(__dirname, undefined, true)[
            "dist/translations.json"
          ]
        );

        assert.propertyVal(
          translations,
          "NEW_USER",
          "Neuer Benutzer",
          "Uses the updated translation"
        );
        assert.propertyVal(
          translations,
          "DELETE_USER",
          "Delete User",
          "Does not delete translations used by other resources"
        );
        assert.notProperty(
          translations,
          "WillBeDeleted",
          "The property is not used by fileChange.js anymore, so we should remove it from the translations.json"
        );

        // Immediately closing the watching results in a haning webpack instance
        // delay the closing till the next tick
        Promise.resolve().then(() => {
          watching.close(() => {
            done();
          });
        });
      }
    });
  });
});

class VolumeOutputFileSystem {
  constructor(volume) {
    const fs = createFsFromVolume(volume);
    this.mkdirp = fs.mkdirp;
    this.mkdir = fs.mkdir.bind(fs);
    this.rmdir = fs.rmdir.bind(fs);
    this.unlink = fs.unlink.bind(fs);
    this.writeFile = fs.writeFile.bind(fs);
    this.join = path.join.bind(path);
  }
}
