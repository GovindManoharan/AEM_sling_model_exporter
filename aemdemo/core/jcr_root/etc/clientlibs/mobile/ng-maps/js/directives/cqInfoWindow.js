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
;(function (angular,undefined) {

    "use strict";

    angular.module("cqMaps").

    /**
     * @ngdoc directive
     * @name cqMaps.directive:cqInfoWindow
     * @element ANY
     *
     * @description
     * A directive for creating a google.maps.InfoWindow.
     *
     */
    directive('cqInfoWindow',
        ['$parse', '$compile', '$timeout', function ($parse, $compile, $timeout) {

                function link(scope, element, attrs) {
                    var opts = angular.extend({}, scope.$eval(attrs.cqInfoWindowOptions));
                    opts.content = element[0];
                    var model = $parse(attrs.cqInfoWindow);
                    var infoWindow = model(scope);

                    /**
                     * The info window's contents don't need to be on the dom anymore,
                     * google maps has them stored. So we just replace the infowindow
                     * element with an empty div. (we don't just straight remove it from
                     * the dom because straight removing things from the dom can mess up
                     * angular)
                     */
                    element.replaceWith('<div></div>');

                    scope.$on('cqMapReady', function(event, arg) {
                        if (!infoWindow) {
                            infoWindow = new google.maps.InfoWindow(opts);
                            model.assign(scope, infoWindow);
                        }
                        //Decorate infoWindow.open to $compile contents before opening
                        var _open = infoWindow.open;
                        infoWindow.open = function open(map, anchor) {
                            $compile(element.contents())(scope);
                            _open.call(infoWindow, map, anchor);
                        };
                    });

                }

                return {
                    restrict: 'A',
                    priority: 100,
                    scope: false,
                    link: link
                };

            }]);

}(angular));