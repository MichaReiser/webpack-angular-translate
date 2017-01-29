import * as lib from "some-lib";

$translate('global variable');
var Test = (function () {
    function Test($translate, $http) {
        var _this = this;
        this.$translate = $translate;
        this.$http = $http;
        this.$translate('translate in constructor');
        $http.get('xy').then(function () { return _this.$translate("translate in arrow function"); });
    }
    Test.prototype.onClick = function () {
        this.$translate('this-translate');
    };
    return Test;
})();
