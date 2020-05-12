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

    /**
     * @doc module
     * @name cqMaps
     *
     * @description
     * Module for embedding Google Maps into CQ mobile apps.
     *
     */
    angular.module("cqMaps", []).

        factory('cqMapDefaults', function() {
            return {
                'precision': 3,
                'mapOptions': {
                    zoom : 8,
                    disableDefaultUI: true,
                    mapTypeControl: false,
                    panControl: false,
                    zoomControl: true,
                    scrollwheel: true
                }
            };
        })

}(angular));