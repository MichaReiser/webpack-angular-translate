var DocumentContext = require("../../dist/html/element-context")
  .DocumentContext;

describe("ElementContext", function() {
  "use strict";

  describe("enter", function() {
    let documentContext;

    beforeEach(function() {
      documentContext = new DocumentContext(
        "test.html",
        `<body class="test"></body>`
      );
    });

    it("sets the parent element correctly", function() {
      var child = documentContext.enter("body", [
        { name: "class", value: "test" }
      ]);

      expect(child.parent).toBe(documentContext);
    });

    it("sets the element name and attributes correctly", function() {
      var child = documentContext.enter("body", [
        { name: "class", value: "test" }
      ]);

      expect(child.tagName).toBe("body");
      expect(child.attributes).toEqual([{ name: "class", value: "test" }]);
    });
  });

  describe("leave", function() {
    it("returns the previous / parent element", function() {
      const documentContext = new DocumentContext(
        "test.html",
        `<body class="test"></body>`
      );
      var child = documentContext.enter("body", [
        { name: "class", value: "test" }
      ]);

      expect(child.leave()).toBe(documentContext);
    });
  });

  describe("suppressDynamicTranslationErrors", function() {
    let documentContext;

    beforeEach(function() {
      documentContext = new DocumentContext(
        "test.html",
        `<body class="test"></body>`
      );
    });

    it("is false by default", function() {
      expect(documentContext.suppressDynamicTranslationErrors).toBe(false);
    });

    it("is true if activated on the current element", function() {
      documentContext.suppressDynamicTranslationErrors = true;
      expect(documentContext.suppressDynamicTranslationErrors).toBe(true);
    });

    it("is true if activated on a parent element", function() {
      documentContext.suppressDynamicTranslationErrors = true;
      var child = documentContext.enter("body");

      expect(child.suppressDynamicTranslationErrors).toBe(true);
    });

    it("is false if activated on a child element", function() {
      var child = documentContext.enter("body");
      child.suppressDynamicTranslationErrors = true;

      expect(documentContext.suppressDynamicTranslationErrors).toBe(false);
    });
  });

  describe("asHtml", function() {
    it("shows the html for the element", function() {
      var body = new DocumentContext("test.html", "<body></body>").enter(
        "body"
      );

      expect(body.asHtml()).toBe("<body>...</body>");
    });

    it("displays the text content of the element", function() {
      var body = new DocumentContext(
        "test.html",
        "<body>Hello World\n</body>"
      ).enter("body");

      body.addText({
        raw: "Hello World\n",
        text: "Hello World"
      });

      expect(body.asHtml()).toBe("<body>Hello World\n</body>");
    });

    it("adds the attributes to the element", function() {
      var body = new DocumentContext(
        "test.html",
        `<body class="test" id="main"></body>`
      ).enter("body", [
        {
          name: "class",
          expressions: [],
          value: "test"
        },
        {
          name: "id",
          value: "main",
          expressions: []
        }
      ]);

      expect(body.asHtml()).toBe("<body class='test' id='main'>...</body>");
    });
  });
});
