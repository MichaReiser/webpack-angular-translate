var assert = require("chai").assert,
    Translation = require("../dist/translation").Translation;

describe("Translations", function () {
    "use strict";

    it("creates a new translation with a resource array if a single resource is passed in", function () {
        var translation = new Translation("test", null, "src/main.html");

        assert.sameMembers(translation.usages, [ "src/main.html" ]);
    });

    it("creates a new translation with a resource array, if a resource array is passed in", function () {
        var translation = new Translation("test", null, [ "src/main.html", "src/login.html"]);

        assert.sameMembers(translation.usages, [ "src/main.html", "src/login.html" ]);
    });

    it("merges the resources when two translations are merged", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", null, "src/login.html");

        var merged = first.merge(second);
        assert.sameMembers(merged.usages, [ "src/main.html", "src/login.html" ]);
        assert.equal(merged.id, "hallo");
        assert.isNull(merged.defaultText);
    });

    it("does not include the same resources twice when merging", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", null, "src/main.html");

        var merged = first.merge(second);
        assert.sameMembers(merged.usages, [ "src/main.html" ]);
        assert.equal(merged.id, "hallo");
        assert.isNull(merged.defaultText);
    });

    it("uses the default text of the translation if one of both translations have a default text", function () {
        var first = new Translation("hallo", null, "src/main.html"),
            second = new Translation("hallo", "Hallo", "src/main.html");

        var merged = first.merge(second);
        assert.equal(merged.id, "hallo");
        assert.equal(merged.defaultText, "Hallo");
    });

    it("uses the default text of the first translations if both translations have a default text", function () {
        var first = new Translation("hallo", "Hello", "src/main.html"),
            second = new Translation("hallo", "Hallo", "src/main.html");

        var merged = first.merge(second);
        assert.equal(merged.id, "hallo");
        assert.equal(merged.defaultText, "Hello");
    });

    it("implements to string", function () {
        var translation = new Translation("hallo", null, [ { resource: "src/main.html", loc: { line: 10, column: 4 } }, { resource: "src/login.html", loc: undefined } ]);

        assert.equal(translation.toString(), "{ id: 'hallo', defaultText: 'null', usages: [ src/main.html:10:4, src/login.html:null:null ] }");
    });

    it("text returns the translation id if the translation has no default text", function () {
        var translation = new Translation("Hello");

        assert.equal(translation.text, "Hello");
    });

    it("text returns the default text if the translation has a default text", function () {
        var translation = new Translation("Hello", "Hallo");

        assert.equal(translation.text, "Hallo");
    });

    it("text returns a string, if a non string value is set as translation id or default text", function () {
        var translation = new Translation("number", 5);

        assert.equal(translation.text, "5");
    });
});