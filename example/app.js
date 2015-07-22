var angular = require("angular");
require("angular-ui-router");
require("angular-translate");
require("angular-translate-loader-url");

function HomeController($translate) {
    "use strict";

    var self = this;

    $translate("Home").then(function (title) {
        self.title = title;
    });
}

function UsersController () {
    "use strict";

    this.user = {
        name: "Test User",
        email: "test@company.ch"
    };
}


var module = angular.module('example', ['ui.router', 'pascalprecht.translate']);

module.config(function ($stateProvider, $urlRouterProvider, $translateProvider) {
    "use strict";

    $stateProvider.state("home", {
        url: '/home',
        template: require("./home.html"),
        controllerAs: 'home',
        controller: HomeController
    });

    $stateProvider.state("user", {
        url: '/user',
        template: require("./user.html"),
        controllerAs: 'userCtrl',
        controller: UsersController
    });

    $urlRouterProvider.otherwise('/home');

    $translateProvider.useUrlLoader('dist/translations.json');
    $translateProvider.preferredLanguage('en');


});

module.run(function ($rootScope) {
    "use strict";
    $rootScope.$on("$stateChangeError", console.log.bind(console));
});