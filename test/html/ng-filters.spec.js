import { matchAngularExpressions } from "../../src/html/ng-filters";

describe("the filter expression matches angular-filters anywhere in the code using {{}}", function() {
  "use strict";

  it("matches a simple translate filter", function() {
    let result = matchAngularExpressions("{{ 'Hy' | translate }}");

    expect(result).toEqual([
      {
        value: "'Hy'",
        match: "{{ 'Hy' | translate }}",
        previousFilters: undefined
      }
    ]);
  });

  it("matches an expression with another filter before translate", function() {
    let result = matchAngularExpressions("{{ 'Hy' | currency | translate }}");

    expect(result).toEqual([
      {
        value: "'Hy'",
        match: "{{ 'Hy' | currency | translate }}",
        previousFilters: "currency"
      }
    ]);
  });

  it("matches an expression with a filter following translate", function() {
    let result = matchAngularExpressions("{{ 'Hy' | translate | limitTo:6 }}");

    expect(result).toEqual([
      {
        value: "'Hy'",
        match: "{{ 'Hy' | translate | limitTo:6 }}",
        previousFilters: undefined
      }
    ]);
  });

  it("matches an expression with a filter before and after translate", function() {
    let result = matchAngularExpressions(
      "{{ 'Hy' | currency | translate | limitTo:6 }}"
    );

    expect(result).toEqual([
      {
        value: "'Hy'",
        match: "{{ 'Hy' | currency | translate | limitTo:6 }}",
        previousFilters: "currency"
      }
    ]);
  });

  it("matches multiple expressions", function() {
    let result = matchAngularExpressions(
      "{{ 'Hy' | translate }}<span title=\"{{ 'Login' | translate}}\"></span>"
    );

    expect(result).toEqual([
      {
        value: "'Hy'",
        match: "{{ 'Hy' | translate }}",
        previousFilters: undefined
      },
      {
        value: "'Login'",
        match: "{{ 'Login' | translate}}",
        previousFilters: undefined
      }
    ]);
  });

  it("matches an attribute with translate followed by another filter without spaces", function() {
    let result = matchAngularExpressions('{{"name"|translate|limitTo:5}}');

    expect(result).toEqual([
      {
        value: '"name"',
        match: '{{"name"|translate|limitTo:5}}',
        previousFilters: undefined
      }
    ]);
  });

  it("matches an attribute with translate where translate follows another filter without spaces", function() {
    let result = matchAngularExpressions('{{"name"|currency|translate}}');

    expect(result).toEqual([
      {
        value: '"name"',
        match: '{{"name"|currency|translate}}',
        previousFilters: "currency"
      }
    ]);
  });

  it("matches property expressions", function() {
    let result = matchAngularExpressions("{{user.sex | translate}}");

    expect(result).toEqual([
      {
        value: "user.sex",
        match: "{{user.sex | translate}}",
        previousFilters: undefined
      }
    ]);
  });

  it("matches the expression inside a string", function() {
    let result = matchAngularExpressions(
      'Static Text: {{ "CHF" | translate }}'
    );

    expect(result).toEqual([
      {
        value: '"CHF"',
        match: '{{ "CHF" | translate }}',
        previousFilters: undefined
      }
    ]);
  });

  it("doesn't match an expression without translate filter", function() {
    let result = matchAngularExpressions("{{ 1 + 2 }}");

    expect(result).toEqual([]);
  });

  it("doesn't match single curly braces ", function() {
    let result = matchAngularExpressions("{{ '{{1 + 2}}' }}");

    expect(result).toEqual([]);
  });

  it("doesn't match '| translate", function() {
    let result = matchAngularExpressions("{{| translate}}");

    expect(result).toEqual([]);
  });

  it("doesn't match a string literal that looks like an expression but misses the {}", function() {
    let result = matchAngularExpressions('"value" | translate');

    expect(result).toEqual([]);
  });

  /**
   * Not supported in the current version
   */
  it("doesn't match the pipe in the string value", function() {
    let result = matchAngularExpressions('{{"value|test" | translate}}');

    expect(result).toEqual([
      {
        value: '"value|test"',
        match: '{{"value|test" | translate}}',
        previousFilters: undefined
      }
    ]);
  });
});
