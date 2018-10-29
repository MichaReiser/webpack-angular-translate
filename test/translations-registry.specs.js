var assert = require("chai").assert;
var Translation = require("../dist/translation").default;
var TranslationsRegistry = require("../dist/translations-registry").default;

describe("TranslationsRegistry", function() {
  "use strict";
  var registry;
  var RESOURCE = "test.js";

  beforeEach(function() {
    registry = new TranslationsRegistry();
  });

  describe("empty", function() {
    it("is true by default", function() {
      assert.ok(registry.empty);
    });

    it("is false if a translation is registered", function() {
      registry.registerTranslation(createTranslation("test"));

      assert.notOk(registry.empty);
    });
  });

  describe("toJSON", function() {
    it("returns an empty object by default", function() {
      assert.deepEqual(registry.toJSON(), {});
    });

    it("returns the registered translation", function() {
      registry.registerTranslation(createTranslation("test", "Test"));

      assert.deepEqual(registry.toJSON(), { test: "Test" });
    });

    it("returns all registered translations", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(createTranslation("other"));

      assert.deepEqual(registry.toJSON(), { test: "Test", other: "other" });
    });
  });

  describe("registerTranslation", function() {
    it("merges translations with the same translation id", function() {
      registry.registerTranslation(createTranslation("test", "Test", 1, 1));
      registry.registerTranslation(createTranslation("test", "Test", 10, 1));

      var translation = registry.getTranslation("test");
      assert(translation, "The translation is registered");

      assert.sameDeepMembers(translation.usages, [
        {
          resource: RESOURCE,
          loc: {
            line: 1,
            column: 1
          }
        },
        {
          resource: RESOURCE,
          loc: {
            line: 10,
            column: 1
          }
        }
      ]);

      assert.deepEqual(
        registry.toJSON(),
        { test: "Test" },
        "should output merged translations only once"
      );
    });

    it("throws if another translation with a different default text exists", function() {
      registry.registerTranslation(createTranslation("test", "Test"));

      assert.throws(function() {
        registry.registerTranslation(
          createTranslation("test", "Other default text", 10)
        );
      }, "Webpack-Angular-Translate: Two translations with the same id but different default text found.\n\tExisting: { id: 'test', defaultText: 'Test', usages: [ test.js:1:1 ] }\n\tnew: { id: 'test', defaultText: 'Other default text', usages: [ test.js:10:1 ] }\n\tPlease define the same default text twice or specify the default text only once.");
    });

    it("throws if the translation id is an empty string", function() {
      assert.throws(function() {
        registry.registerTranslation(createTranslation(""));
      }, "Invalid angular-translate translation '{ id: '', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js).");
    });

    it("throws if the translation id is undefined", function() {
      assert.throws(function() {
        registry.registerTranslation(createTranslation());
      }, "Invalid angular-translate translation '{ id: 'undefined', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js).");
    });

    it("throws if the translation id is null", function() {
      assert.throws(function() {
        registry.registerTranslation(createTranslation(null));
      }, "Invalid angular-translate translation '{ id: 'null', defaultText: 'undefined', usages: [ test.js:1:1 ] }' found. The id of the translation is empty, consider removing the translate attribute (html) or defining the translation id (js).");
    });
  });

  describe("pruneTranslations", function() {
    it("removes all translations from the specified resource", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(createTranslation("other", "Other"));

      registry.pruneTranslations(RESOURCE);

      assert(registry.empty, "all translations are removed");
      assert.deepEqual(registry.toJSON(), {});
    });

    it("does not remove translations from other resources", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("other", "Other", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);

      assert.notOk(
        registry.empty,
        "The translations from other.js are not removed"
      );
      assert.deepEqual(registry.toJSON(), { other: "Other" });
    });

    it("does not remove translation if it is used by another resource", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("test", "Test", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);

      assert.notOk(
        registry.empty,
        "The translations from other.js are not removed"
      );
      assert.deepEqual(registry.toJSON(), { test: "Test" });
    });

    it("removes a translation if all usages have been pruned", function() {
      registry.registerTranslation(createTranslation("test", "Test"));
      registry.registerTranslation(
        new Translation("test", "Test", {
          resource: "other.js",
          loc: { line: 1, column: 1 }
        })
      );

      registry.pruneTranslations(RESOURCE);
      registry.pruneTranslations("other.js");

      assert(registry.empty, "all translations are removed");
      assert.deepEqual(registry.toJSON(), {});
    });
  });

  function createTranslation(id, defaultText, line, column) {
    return new Translation(id, defaultText, {
      resource: RESOURCE,
      loc: { line: line || 1, column: column || 1 }
    });
  }
});
