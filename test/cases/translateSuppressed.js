/** Test if it's possible to suppress dynamic $translate calls */

function errorShouldBeSuppressed() {
    /* suppress-dynamic-translation-error: true */

    var x;

    $translate(x);
}

function noSuppressionHere() {
    "use strict";
    $translate(1+3);
}