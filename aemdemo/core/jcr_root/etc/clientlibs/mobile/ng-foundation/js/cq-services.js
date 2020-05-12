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

    /* Services */
    angular.module('cqServices', ['btford.phonegap.ready'])

        /**
         * Generic utilities that can be used by any application.
         */
        .factory('cqUtils', [function() {

            return {

                /**
                 * Wrap any object in an array.  A null object will return an empty array. An object that is
                 * already an array will be returned as-is.  Any other object will become the first item in the returned
                 * array.
                 * @param obj
                 * @returns {Array}
                 */
                makeArray: function(obj) {
                    if (obj == null) {
                        return [];
                    }
                    if (angular.isArray(obj)) {
                        return obj;
                    }
                    return [obj];
                }

            };
        }])

        /**
         * Mobile device specific utilities.
         */
        .factory('cqDeviceUtils', ['$window', 'phonegapReady', function($window, phonegapReady) {

            function isConnected() {
                if ($window.navigator.network) {
                    var networkState = $window.navigator.network.connection.type;
                    return (networkState != Connection.UNKNOWN && networkState != Connection.NONE);
                } else {
                    return true;
                }
            }

            function isiOS() {
                if ($window.device) {
                    return ($window.device.platform == "iOS");
                }
            }

            function isAndroid() {
                if ($window.device) {
                    return ($window.device.platform == "Android");
                }
            }


            /**
             *  Returns a Cordova Position object in success handler.
             *  http://docs.phonegap.com/en/3.3.0/cordova_geolocation_geolocation.md.html#Position
             *
             * @param success
             * @param error
             */
            function getPosition(success, error) {

                var options = {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 10000
                };

                var fail = function(err) {
                    //try again
                    navigator.geolocation.getCurrentPosition(success, error, angular.extend(options, {enableHighAccuracy: false}));
                };

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(success, fail, options);
                    console.log("Requesting device location...");
                }
            }

            return {
                /**
                 *
                 * @returns {boolean} true if the device has any type of network connectivity
                 */
                isConnected: isConnected,

                isiOS: phonegapReady(isiOS),
                isAndroid: phonegapReady(isAndroid),

                /**
                 * Requests the current geo-location of the device.  Resulting coordinates will be returned
                 * in the success callback.
                 * @param success callback
                 * @param error callback
                 */
                getPosition: phonegapReady(getPosition)

            };
        }]);


}(angular));


