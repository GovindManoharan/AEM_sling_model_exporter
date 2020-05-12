/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2013 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/
;(function (angular, undefined) {

    "use strict";

    angular.module("cqToast", [])

        .service('cqToastService', ['$rootScope', function ($rootScope) {
            this.pop = function (msg, time) {
                this.toast = {
                    message: msg,
                    timeout: time
                };
                $rootScope.$broadcast('toaster-show');
            };
            this.clear = function () {
                $rootScope.$broadcast('toaster-hide');
            };
        }])

        .constant('cqToastConfig', {
            'timeout': 5000
        })

        .directive('cqToast', ['$parse', '$compile', '$timeout', 'cqToastConfig', 'cqToastService',
            function ($parse, $compile, $timeout, toastConfig, toaster) {
                return {
                    scope: true,
                    restrict: 'A',
                    link: function (scope, el, attrs){

                        var mergedConfig = toastConfig;
                        if (attrs.toastOptions) {
                            angular.extend(mergedConfig, scope.$eval(attrs.toastOptions));
                        }

                        el.addClass('cq-toast');

                        function showToast (toast) {
                            scope.removeToast();
                            scope.addToast(toast);
                        }

                        function hideToast() {
                            el.css("opacity", 0);
                            scope.removeToast();
                        }

                        scope.$watch('toast', function(toast) {
                            if (toast && toast.message) {
                                el.css("opacity", 0.9);
                                var timeout = typeof(toast.timeout) == "number" ? toast.timeout : mergedConfig['timeout'];
                                if (timeout > 0) {
                                    scope.timerId = $timeout(function () {
                                        hideToast();
                                    }, timeout);
                                }
                            } else {
                                hideToast();
                            }
                        });

                        scope.$on('toaster-show', function () {
                            showToast(toaster.toast);
                        });
                        scope.$on('toaster-hide', function () {
                            hideToast();
                        });
                    },
                    controller: ['$scope', '$timeout', function($scope, $timeout) {

                        $scope.timerId = null;

                        $scope.stopTimer = function(){
                            if($scope.timerId)
                                $timeout.cancel($scope.timerId);
                        };

                        $scope.getToast = function() {
                            return $scope.toast;
                        };

                        $scope.addToast = function (toast) {
                            $scope.toast = toast;
                        };

                        $scope.removeToast = function() {
                            $scope.stopTimer();
                            $scope.toast = null;
                        };
                    }]
                };
            }]);

}(angular));