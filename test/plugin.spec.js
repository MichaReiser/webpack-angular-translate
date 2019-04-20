import webpack from "webpack";
import deepExtend from "deep-extend";
import { Volume, createFsFromVolume } from "memfs";
import { ufs } from "unionfs";
import path from "path";
import fs from "fs";

// The main plugin can not be imported from the typescript source
// because webpack seems to modify the loader path
import * as WebPackAngularTranslate from "../dist/index";

import "./translate-jest-matchers";

/**
 * Helper function to implement tests that verify the result in the translations.js
 * @param fileName {string} the filename of the input file (the file to process by webpack)
 * @param doneCallback the done callback from mocha that is invoked when the test has completed
 * @param assertCallback {function({}, {})} Callback that contains the assert statements. the first argument
 * is the source of the translations file. The webpack stats (containing warnings and errors) is passed as second argument.
 */
async function compileAndGetTranslations(fileName, customTranslationExtractors) {
  if (!customTranslationExtractors) {
    customTranslationExtractors = [];
  }
  var options = webpackOptions({
    entry: ["./test/cases/" + fileName]
  }, customTranslationExtractors);

  const { error, stats, volume } = await compile(options);
  expect(error).toBeFalsy();

  var translations = {};
  if (stats.compilation.assets["translations.json"]) {
    translations = JSON.parse(
      volume.toJSON(__dirname, undefined, true)["dist/translations.json"]
    );
  }

  return { translations, stats };
}

function webpackOptions(options, customTranslationExtractors) {
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
                loader: WebPackAngularTranslate.htmlLoader(),
                options: {
                  translationExtractors: customTranslationExtractors
                }
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

    expect(error).toBeNull();
    expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleBuildError: "The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section.",
]
`);
  });

  describe("directive", function() {
    "use strict";

    it("extracts the translation id if translate is used as attribute", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");

      expect(translations).toMatchObject({
        "attribute-translation": "attribute-translation"
      });
    });

    it("extracts the translation id if translate is used as element", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");
      expect(translations).toMatchObject({
        "element-translation": "element-translation"
      });
    });

    it("extracts the translation id from the attribute if specified", async function() {
      const { translations } = await compileAndGetTranslations("simple.html");
      expect(translations).toMatchObject({
        "id-in-attribute": "id-in-attribute"
      });
    });

    it("extracts the default text if translate is used as attribute", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.html"
      );
      expect(translations).toMatchObject({ Login: "Anmelden" });
    });

    it("extracts the default text if translate is used as element", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.html"
      );

      expect(translations).toMatchObject({ Logout: "Abmelden" });
    });

    it("extracts the translation id if a translation for an attribute is defined", async function() {
      const { translations } = await compileAndGetTranslations(
        "attributes.html"
      );
      expect(translations).toMatchObject({
        "attribute-id": "attribute-id"
      });
    });

    it("extracts the default text for an attribute translation", async function() {
      const { translations } = await compileAndGetTranslations(
        "attributes.html"
      );
      expect(translations).toMatchObject({
        "attribute-default-id": "Default text for attribute title"
      });
    });

    it("emits an error if an angular expression is used as attribute id", async function() {
      const { stats } = await compileAndGetTranslations("expressions.html");

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Failed to extract the angular-translate translations from 'expressions.html':8:1: The element '<h1 translate=''>{{editCtrl.title}}</h1>' uses an angular expression as translation id ('{{editCtrl.title}}') or as default text ('undefined'). This is not supported. Either use a string literal as translation id and default text or suppress this error by adding the 'suppress-dynamic-translation-error' attribute to this element or any of its parents.",
]
`);
    });

    it("emits an error if a translated angular element has multiple child text elements and does not specify an id", async () => {
      const { stats } = await compileAndGetTranslations(
        "multiple-child-texts.html"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Failed to extract the angular-translate translations from 'multiple-child-texts.html':8:4: The element does not specify a translation id but has multiple child text elements. Specify the translation id on the element to define the translation id.",
]
`);
    });

    it("does suppress errors for dynamic translations if the element is attributed with suppress-dynamic-translation-error", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "expressions-suppressed.html"
      );
      expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);
      expect(translations).toEqual({});
    });

    it("removes the suppress-dynamic-translation-error attribute for non dev build", async function() {
      const { stats } = await compileAndGetTranslations(
        "expressions-suppressed.html"
      );
      var output = stats.compilation.assets["main.js"].source();

      expect(output).toMatch("{{editCtrl.title}}");
      expect(output).not.toMatch("suppress-dynamic-translation-error");
    });
  });

  describe("filter", function() {
    it("matches a filter in the body of an element", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      expect(translations).toMatchObject({ Home: "Home" });
    });

    it("matches a filter in an attribute of an element", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      expect(translations).toMatchObject({ Waterfall: "Waterfall" });
    });

    it("matches an expression in the middle of the element text content", async function() {
      const { translations } = await compileAndGetTranslations(
        "filter-simple.html"
      );
      expect(translations).toMatchObject({ Top: "Top" });
    });

    it("matches multiple expressions in a single text", async function() {
      const { translations } = await compileAndGetTranslations(
        "multiple-filters.html"
      );
      expect(translations).toMatchObject({
        Result: "Result",
        of: "of"
      });
    });

    it("emits an error if a dynamic value is used in the translate filter", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "dynamic-filter-expression.html"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Failed to extract the angular-translate translations from 'dynamic-filter-expression.html':8:14: A dynamic filter expression is used in the text or an attribute of the element '<h1 id='top'>{{ editCtrl.title | translate }}</h1>'. Add the 'suppress-dynamic-translation-error' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).",
]
`);
      expect(translations).toEqual({});
    });

    it("emits an error if a filter is used before the translate filter", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "filter-chain.html"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Failed to extract the angular-translate translations from 'filter-chain.html':8:14: Another filter is used before the translate filter in the element <h1 id='top'>{{ \\"5.0\\" | currency | translate }}</h1>. Add the 'suppress-dynamic-translation-error' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).",
]
`);
      expect(translations).toEqual({});
    });

    it("suppress dynamic translations errors if element or parent is attribute with suppress-dynamic-translation-error", async function() {
      const { stats } = await compileAndGetTranslations(
        "dynamic-filter-expression-suppressed.html"
      );
      expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);
    });

    it("suppress dynamic translations errors for custom elements when attributed with suppress-dynamic-translation-error", async function() {
      const { stats } = await compileAndGetTranslations(
        "dynamic-filter-custom-element.html"
      );
      expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);
    });

    it("can parse an invalid html file", async function() {
      const { translations } = await compileAndGetTranslations(
        "invalid-html.html"
      );
      expect(translations).toMatchObject({ Result: "Result" });
    });

    it("can parse an html containing an attribute that starts with a $", async function() {
      const { translations } = await compileAndGetTranslations(
        "html-with-dollar-attribute.html"
      );
      expect(translations).toMatchObject({ Test: "Test" });
    });
  });

  it("can be used with the angular i18n translation extractor", async function() {
    "use strict";

    const { translations } = await compileAndGetTranslations(
        "translate-and-i18n.html",
        [WebPackAngularTranslate.angularI18nTranslationsExtractor]);

    assert.propertyVal(
        translations,
        "translateId",
        "Translate translation"
    );

    assert.propertyVal(
        translations,
        "i18nId",
        "I18n translation"
    );

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

    expect(error).toBeNull();
    expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleBuildError: "The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section.",
]
`);
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
    expect(error).toBeNull();
    expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);
  });

  describe("$translate", function() {
    it("extracts the translation id when the $translate service is used as global variable ($translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      expect(translations).toMatchObject({
        "global variable": "global variable"
      });
    });

    it("extracts the translation id when the $translate service is used in the constructor", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      expect(translations).toMatchObject({
        "translate in constructor": "translate in constructor"
      });
    });

    it("extracts the translation id when the $translate service is used in an arrow function (() => this.$translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      expect(translations).toMatchObject({
        "translate in arrow function": "translate in arrow function"
      });
    });

    it("extracts the translation id when the $translate service is used in a member function (this.$translate)", async function() {
      const { translations } = await compileAndGetTranslations("simple.js");
      expect(translations).toMatchObject({
        "this-translate": "this-translate"
      });
    });

    it("extracts multiple translation id's when an array is passed as argument", async function() {
      const { translations } = await compileAndGetTranslations("array.js");
      expect(translations).toMatchObject({
        FIRST_PAGE: "FIRST_PAGE",
        Next: "Next"
      });
    });

    it("extracts instant translation id", async function() {
      const { translations } = await compileAndGetTranslations("instant.js");
      expect(translations).toMatchObject({
        FIRST_TRANSLATION: "FIRST_TRANSLATION",
        SECOND_TRANSLATION: "SECOND_TRANSLATION"
      });
      expect(translations).not.toHaveProperty("SKIPPED_TRANSLATION");
    });

    it("extracts the default text", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.js"
      );
      expect(translations).toMatchObject({ Next: "Weiter" });
    });

    it("extracts the default text when an array is passed for the id's", async function() {
      const { translations } = await compileAndGetTranslations(
        "defaultText.js"
      );
      expect(translations).toMatchObject({
        FIRST_PAGE: "Missing",
        LAST_PAGE: "Missing"
      });
    });

    it("emits errors if $translate is used with invalid arguments", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "invalid$translate.js"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Illegal argument for call to $translate: A call to $translate requires at least one argument that is the translation id. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (invalid$translate.js:1:0)",
  ModuleError: "Illegal argument for call to $translate: The translation id should either be a string literal or an array containing string literals. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (invalid$translate.js:4:0)",
]
`);
      expect(translations).toEqual({});
    });

    it("a comment suppress the dynamic translation errors for $translate", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "translateSuppressed.js"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Illegal argument for call to $translate: The translation id should either be a string literal or an array containing string literals. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (translateSuppressed.js:13:4)",
]
`);
      expect(translations).toEqual({});
    });
  });

  describe("i18n.registerTranslation", function() {
    it("register translation", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerTranslation.js"
      );
      expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);

      expect(translations).toEqual({
        NEW_USER: "New user",
        EDIT_USER: "Edit user",
        "5": "true"
      });
    });

    it("register translation with invalid arguments", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerInvalidTranslation.js"
      );

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal (registerInvalidTranslation.js:2:0)",
  ModuleError: "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal (registerInvalidTranslation.js:4:0)",
]
`);
      expect(translations).toEqual({});
    });
  });

  describe("i18n.registerTranslations", function() {
    it("register translations", async function() {
      const { translations, stats } = await compileAndGetTranslations(
        "registerTranslations.js"
      );
      expect(stats.compilation.errors).toMatchInlineSnapshot(`Array []`);

      expect(translations).toEqual({
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

      expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  ModuleError: "Illegal argument for call to i18n.registerTranslations: The value for the key 'key' needs to be a literal (registerInvalidTranslations.js:5:0)",
  ModuleError: "Illegal argument for call to i18n.registerTranslations: requires a single argument that is an object where the key is the translationId and the value is the default text (registerInvalidTranslations.js:1:0)",
]
`);
      expect(translations).toEqual({});
    });
  });
});

describe("Plugin", function() {
  it("emits an error if the same id with different default texts is used", async function() {
    const { translations, stats } = await compileAndGetTranslations(
      "differentDefaultTexts.js"
    );

    expect(stats.compilation.errors).toMatchInlineSnapshot(`
Array [
  [Error: Webpack-Angular-Translate: Two translations with the same id but different default text found.
	Existing: {
  "id": "Next",
  "defaultText": "Weiter",
  "usages": [
    "differentDefaultTexts.js:5:8"
  ]
}
	New: {
  "id": "Next",
  "defaultText": "Missing",
  "usages": [
    "differentDefaultTexts.js:6:8"
  ]
}
	Please define the same default text twice or specify the default text only once.],
]
`);
    expect(translations).toEqual({});
  });

  it("emits a warning if the translation id is missing", async function() {
    const { translations, stats } = await compileAndGetTranslations(
      "emptyTranslate.html"
    );
    expect(stats.compilation.warnings).toHaveLength(1);

    expect(stats.compilation.warnings).toMatchInlineSnapshot(`
Array [
  [Error: Invalid angular-translate translation found: The id of the translation is empty. Consider removing the translate attribute (html) or defining the translation id (js).
Translation:
'{
  "id": "",
  "defaultText": null,
  "usages": [
    "emptyTranslate.html:5:8"
  ]
}'],
]
`);

    expect(translations).toEqual({});
  });

  it("does not add translations twice if file is recompiled after change", async function() {
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

    var secondCompilationStats = await new Promise((resolve, reject) => {
      var firstRun = true;
      var watching = compiler.watch({}, function(error, stats) {
        if (error) {
          return reject(error);
        }

        if (firstRun) {
          if (stats.compilation.errors.length > 0) {
            return reject(stats.compilation.errors);
          }

          firstRun = false;
          projectVolume.writeFileSync(
            "./fileChange.js",
            "i18n.registerTranslation('NEW_USER', 'Neuer Benutzer');"
          );

          watching.invalidate(); // watch doesn't seem to work with memory fs
        } else {
          watching.close(() => resolve(stats));
        }
      });
    });

    expect(secondCompilationStats.compilation.errors).toHaveLength(0);

    var translations = JSON.parse(
      outputVolume.toJSON(__dirname, undefined, true)["dist/translations.json"]
    );

    expect(translations).toEqual({
      NEW_USER: "Neuer Benutzer",
      DELETE_USER: "Delete User"
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
