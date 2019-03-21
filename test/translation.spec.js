import { Translation } from "../src/translation";

describe("Translations", function() {
  "use strict";

  it("creates a new translation with a resource array if a single resource is passed in", function() {
    var translation = new Translation("test", null, "src/main.html");

    expect(translation.usages).toEqual(["src/main.html"]);
  });

  it("creates a new translation with a resource array, if a resource array is passed in", function() {
    var translation = new Translation("test", null, [
      "src/main.html",
      "src/login.html"
    ]);

    expect(translation.usages).toEqual(["src/main.html", "src/login.html"]);
  });

  it("merges the resources when two translations are merged", function() {
    var first = new Translation("hallo", null, "src/main.html"),
      second = new Translation("hallo", null, "src/login.html");

    var merged = first.merge(second);
    expect(merged.usages).toEqual(["src/main.html", "src/login.html"]);
    expect(merged.id).toBe("hallo");
    expect(merged.defaultText).toBeNull();
  });

  it("does not include the same resources twice when merging", function() {
    var first = new Translation("hallo", null, "src/main.html"),
      second = new Translation("hallo", null, "src/main.html");

    var merged = first.merge(second);
    expect(merged.usages).toEqual(["src/main.html"]);
    expect(merged.id).toBe("hallo");
    expect(merged.defaultText).toBeNull();
  });

  it("uses the default text of the translation if one of both translations have a default text", function() {
    var first = new Translation("hallo", null, "src/main.html"),
      second = new Translation("hallo", "Hallo", "src/main.html");

    var merged = first.merge(second);
    expect(merged.id).toBe("hallo");
    expect(merged.defaultText).toBe("Hallo");
  });

  it("uses the default text of the first translations if both translations have a default text", function() {
    var first = new Translation("hallo", "Hello", "src/main.html"),
      second = new Translation("hallo", "Hallo", "src/main.html");

    var merged = first.merge(second);
    expect(merged.id).toBe("hallo");
    expect(merged.defaultText).toBe("Hello");
  });

  it("implements to string", function() {
    var translation = new Translation("hallo", null, [
      { resource: "src/main.html", loc: { line: 10, column: 4 } },
      { resource: "src/login.html", loc: undefined }
    ]);

    expect(translation.toString()).toBe(
      "{ id: 'hallo', defaultText: 'null', usages: [ src/main.html:10:4, src/login.html:null:null ] }"
    );
  });

  it("text returns the translation id if the translation has no default text", function() {
    var translation = new Translation("Hello");

    expect(translation.text).toBe("Hello");
  });

  it("text returns the default text if the translation has a default text", function() {
    var translation = new Translation("Hello", "Hallo");

    expect(translation.text).toBe("Hallo");
  });

  it("text returns a string, if a non string value is set as translation id or default text", function() {
    var translation = new Translation("number", 5);

    expect(translation.text).toBe("5");
  });
});
