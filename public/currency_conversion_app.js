(function () {
    'use strict';
    var currency_conversion_app = angular.module('currency_conversion_app', ['ngResource']);

    currency_conversion_app.controller('currency_conversion_ctrl', ['$scope', '$resource', '$timeout', function (scope, $resource, $timeout) {
        // Fetch exchange rate data from api
        $.getJSON("http://openexchangerates.org/api/currencies.json", function (data) {
            scope.currencies = data;
            scope.$apply();
        });

        //Calculate and output the new currency rate
        scope.exchangeCurrency = function () {
            if (!(scope.fromCurrency && scope.toCurrency)) {
                alert('Select both Currencies');
                return;
            }
            $resource('/exchangeRates').save({ from: scope.fromCurrency, to: scope.toCurrency }, function (res) {
                if (res.result[0] == 'err')
                    scope.error = "Error caught while getting the rate";
                else
                    scope.showRate = res.result[0];
            });
        }

        //calling every 5 second for live status of beanstalkd used tube
        scope.stats_tube = function () {
            $resource('/stats_tube').query({}, function (data) {
                scope.stat_Tube_Data = data[0];
            }, function (err) {
                console.log(err);
            })
        }

        function refresh() {
            scope.stats_tube();
            $timeout(refresh, 5000);
        }
        refresh();
    }]);

})();

