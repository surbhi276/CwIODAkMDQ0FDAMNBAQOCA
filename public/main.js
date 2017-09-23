(function () {
    'use strict';
    var app = angular.module('app', ['ngResource']);

    app.controller('appCtrl', ['$scope', '$resource', '$timeout', function (scope, $resource, $timeout) {
        // Fetch exchange rate data from api
        $.getJSON("http://openexchangerates.org/api/currencies.json", function (data) {
            console.log(data)
            scope.currencies = data;
            scope.$apply();
        });

        //Calculate and output the new amount
        scope.exchangeCurrency = function () {
            console.log(scope)
            if (!(scope.fromCurrency && scope.toCurrency)) {
                alert('Select both Currencies');
                return;
            }
            $resource('/exchangeRates').save({ from: scope.fromCurrency, to: scope.toCurrency }, function (res) {
                console.log(res);
                scope.showRate = res.result[0];
            });
        }


        scope.click = function (name) {
            $resource('/' + name).query({ jobid: scope.jobid, delay: scope.delay, payload: { name: "surbhi" } }, function (data) {
                scope.stat_Tube_Data = data[0];
                console.log(scope.stat_Tube_Data);
            }, function (err) {
                console.log(err);
            })
        }

        function refreshApi() {
            scope.click('stats_tube')
            $timeout(refreshApi, 5000);
        }
        refreshApi();
    }]);

})();

