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
     * Google Maps API Utilities
     */
    factory('cqMapUtils', ['$parse', function($parse) {

        function floatEqual (f1, f2) {
            return (Math.abs(f1 - f2) < 0.000001);
        }

        /**
         * @ngdoc function
         * @name #latLngEqual
         * @methodOf cqMaps.service:caMapUtils
         *
         * @param {google.maps.LatLng} l1 first
         * @param {google.maps.LatLng} l2 second
         * @return {boolean} true if l1 and l2 are 'very close'. If either are null
         * or not google.maps.LatLng objects returns false.
         */
        function latLngEqual(l1, l2) {
            if (!(l1 instanceof google.maps.LatLng &&
                l2 instanceof google.maps.LatLng)) {
                return false;
            }
            return floatEqual(l1.lat(), l2.lat()) && floatEqual(l1.lng(), l2.lng());
        }

        /**
         * @ngdoc function
         * @name #boundsEqual
         * @methodOf cqMaps.service:caMapUtils
         *
         * @param {google.maps.LatLngBounds} b1 first
         * @param {google.maps.LatLngBounds} b2 second
         * @return {boolean} true if b1 and b2 are 'very close'. If either are null
         * or not google.maps.LatLngBounds objects returns false.
         */
        function boundsEqual(b1, b2) {
            if (!(b1 instanceof google.maps.LatLngBounds &&
                b2 instanceof google.maps.LatLngBounds)) {
                return false;
            }
            var sw1 = b1.getSouthWest();
            var sw2 = b2.getSouthWest();
            var ne1 = b1.getNorthEast();
            var ne2 = b2.getNorthEast();

            return latLngEqual(sw1, sw2) && latLngEqual(ne1, ne2);
        }

        /**
         * @ngdoc function
         * @name #hasNaN
         * @methodOf cqMaps.service:caMapUtils
         *
         * @param {google.maps.LatLng} latLng the LatLng
         * @return {boolean} true if either lat or lng of latLng is null or isNaN
         */
        function hasNaN(latLng) {
            if (!(latLng instanceof google.maps.LatLng))
                throw 'latLng must be a google.maps.LatLng';

            // google.maps.LatLng converts NaN to null, so check for both
            var isNull = (latLng.lat() == null || latLng.lng() == null);
            var isNotaN =  isNaN(latLng.lat()) || isNaN(latLng.lng());
            return isNull || isNotaN;
        }

        /**
         * @ngdoc function
         * @name #objToLatLng
         * @methodOf cqMaps.service:cqMapUtils
         *
         * @param {Object,String,google.maps.LatLng} obj of the form { lat: 40, lng: -120 } or { latitude: 40, longitude: -120 } or
         *                      comma separated string "40,-120"
         * @return {google.maps.LatLng} returns null if problems with obj (null, NaN, etc.)
         */
        function objToLatLng(obj) {
            var lat,lng;
            if (obj instanceof  google.maps.LatLng) {
                return obj;
            }
            if (angular.isObject(obj)) {
                lat = obj.lat || obj.latitude || null;
                lng = obj.lng || obj.longitude || null;
            } else if (angular.isString(obj)) {
                obj = obj.split(",");
                if (angular.isArray(obj) && obj.length == 2) {
                    lat = parseFloat(obj[0]) || null;
                    lng = parseFloat(obj[1]) || null;
                }
            }

            var ok = !(lat == null || lng == null) && !(isNaN(lat) || isNaN(lng));
            if (ok) {
                return new google.maps.LatLng(lat, lng);
            }
            return null;
        }

        /**
         * @ngdoc function
         * @name #latLngToObj
         * @methodOf cqMaps.service:cqMapUtils
         *
         * @param {google.maps.LatLng}
         * @return {Object} returns null if problems with obj (null, NaN, etc.)
         */
        function latLngToObj(obj) {
            if (obj instanceof  google.maps.LatLng) {
                return {lat:obj.lat(),lng:obj.lng()};
            }
            return null;
        }

        /**
         * @ngdoc function
         * @name #getAddressName
         * @methodOf cqMaps.service:cqMapUtils
         *
         * @param {Object}
         * @return {String} the value of the address component name
         */
        function getAddressComponentName(list, type) {
            if (angular.isArray(list)) {
                for (var i=0; i < list.length; i++) {
                    var value = list[i];
                    if (value.types && value.types.indexOf(type) >= 0) {
                        return value.long_name;
                    }
                }
            }
            return null;
        }

        /**
         * @param {Object} attrs directive attributes
         * @return {Object} mapping from event names to handler fns
         */
        function getEventHandlers(attrs, type) {
            var handlers = {};
            type = type || "";
            if (type.length > 0) {
                type = type.charAt(0).toUpperCase() + type.substring(1);
            }
            // retrieve cq-on-... handlers
            angular.forEach(attrs, function(value, key) {
                if (key.lastIndexOf('cqOn'+type, 0) === 0) {
                    var event = angular.lowercase(
                        key.substring(4+type.length)
                            .replace(/(?!^)([A-Z])/g, '_$&')
                    );
                    var fn = $parse(value);
                    handlers[event] = fn;
                }
            });

            return handlers;
        }

        return {
            latLngEqual: latLngEqual,
            boundsEqual: boundsEqual,
            hasNaN: hasNaN,
            toLatLng: objToLatLng,
            fromLatLng: latLngToObj,
            getAddressName: getAddressComponentName,
            getEventHandlers: getEventHandlers
        };
    }]);

}(angular));