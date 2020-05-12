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
     * Directive controller which is owned by the [cqMaps]{@link module:cqMaps} module
     * and shared among all map directives.
     */
    controller('cqMapController',
        ['$scope', '$element', '$timeout', 'cqMapUtils', 'cqMapDefaults',
            function ($scope, $element, $timeout, cqMapUtils, cqMapDefaults) {

                /*
                 * Construct a new controller for the map directive.
                 * @param {angular.Scope} $scope
                 * @param {angular.element} $element
                 * @constructor
                 */
                var constructor = function($scope, $element) {

                    this._markers = {};

                    Object.defineProperties(this, {
                        'precision': {
                            value: cqMapDefaults.precision,
                            writeable: false
                        },
                        'center': {
                            get: function() {
                                return this._map.getCenter();
                            },
                            set: function(center) {
                                if (cqMapUtils.hasNaN(center))
                                    throw 'center contains null or NaN';
                                var changed = !cqMapUtils.latLngEqual(this.center, center);
                                if (changed) {
                                    this._map.panTo(center);
                                }
                            }
                        },
                        'zoom': {
                            get: function() {
                                return this._map.getZoom();
                            },
                            set: function(zoom) {
                                if (!(zoom != null && !isNaN(zoom)))
                                    throw 'zoom was null or NaN';
                                var changed = this.zoom !== zoom;
                                if (changed) {
                                    this._map.setZoom(zoom);
                                }
                            }
                        },
                        'bounds': {
                            get: function() {
                                return this._map.getBounds();
                            },
                            set: function(bounds) {
                                var numbers = !cqMapUtils.hasNaN(bounds.getSouthWest()) &&
                                    !cqMapUtils.hasNaN(bounds.getNorthEast());
                                if (!numbers)
                                    throw 'bounds contains null or NaN';

                                var changed = !(cqMapUtils.boundsEqual(this.bounds, bounds));
                                if (changed) {
                                    this._map.fitBounds(bounds);
                                }
                            }
                        }

                    });

                    $scope.$on('$destroy', angular.bind(this, this._destroy));

                };

                // Retrieve google.maps.MapOptions
                this._getConfig = function(options) {
                    var config = {};
                    angular.extend(config, {
                            zoomControlOptions: {
                                style: google.maps.ZoomControlStyle.SMALL,
                                position: google.maps.ControlPosition.TOP_RIGHT
                            },
                            mapTypeId: google.maps.MapTypeId.ROADMAP
                        },
                        cqMapDefaults.mapOptions,
                        $scope.mapOptions(),
                        options);
                    return config;
                };

                // Create the map
                this.createMap = function(element, options) {
                    options = this._getConfig(options);
                    if (!this._map) {
                        google.maps.visualRefresh = true;
                        this._map = new google.maps.Map(element[0], options);
                    } else {
                        this._map.setOptions(options);
                    }
                };

                this._destroy = function() {

                };

                /**
                 * Alias for google.maps.event.trigger(map, event)
                 * @param {string} event an event defined on google.maps.Map
                 * @ignore
                 */
                this.trigger = function(event) {
                    google.maps.event.trigger(this._map, event);
                };

                /**
                 * Adds a new marker to the map.
                 * @param {number} scope id
                 * @param {number} location
                 */
                this.addMarker = function(scopeId, location, options) {
                    if (!this._map) return;

                    var markerLatLng = cqMapUtils.toLatLng(location.coordinates || location);
                    var marker = new google.maps.Marker(angular.extend({}, {
                        position: markerLatLng
                    }, options));
                    marker.setMap(this._map);

                    var position = marker.getPosition();
                    if (position) {
                        var hash = position.toUrlValue(this.precision);
                        if (this._markers[scopeId] == null) {
                            this._markers[scopeId] = {};
                        }
                        this._markers[scopeId][hash] = {marker:marker, location:location};
                    }

                    return marker;
                };

                /**
                 * Retrieve marker from map.
                 * @param {number} scope id
                 * @param {number} location
                 * @return {google.maps.Marker} the marker at given location, or null if
                 *   no such marker exists
                 * @ignore
                 */
                this.getMarker = function (scopeId, location) {
                    if (location == null)
                        throw 'location was null';

                    var latLng = new google.maps.LatLng(location.coordinates.lat,location.coordinates.lng);
                    var hash = latLng.toUrlValue(this.precision);
                    if (this._markers[scopeId] != null && hash in this._markers[scopeId]) {
                        return this._markers[scopeId][hash].marker;
                    } else {
                        return null;
                    }
                };

                /**
                 * Clear all markers from map
                 * @param {number} scope id
                 * @ignore
                 */
                this.clearMarkers = function (scopeId) {
                    if (this._markers[scopeId] != null) {
                        angular.forEach(this._markers[scopeId], function(object, i) {
                            if (object) {
                                object.marker.setMap(null);
                            }
                        });
                        this._markers[scopeId] = null;
                        delete this._markers[scopeId];
                    }
                };

                /**
                 * Reposition map to fit within bounds defined by provided positions.
                 * @param {array} list of positions to use
                 * @return {google.maps.LatLngBounds} the resulting bounds
                 */
                this.reposition = function(positions) {
                    if (!angular.isArray(positions))
                        throw 'positions is not an array';

                    if (positions.length > 0) {
                        var zoom = this.zoom;
                        var bounds = new google.maps.LatLngBounds();
                        angular.forEach(positions, function(object, i) {
                            bounds.extend(cqMapUtils.toLatLng(object));
                        });
                        this.bounds = bounds;
                        if (positions.length == 1) {
                            this.zoom = zoom;
                        }
                        return bounds;
                    }

                    return null;
                };

                /**
                 * Get current map.
                 * @returns {object}
                 * @ignore
                 */
                this.getMap = function() {
                    return this._map;
                };

                /** Instantiate controller */
                angular.bind(this, constructor)($scope, $element);

            }
        ]);


}(angular));