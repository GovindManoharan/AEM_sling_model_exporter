/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2014 Adobe Systems Incorporated
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
;(function (angular, document, contentInit, undefined) {

    angular.module('cqContentSync', ['btford.phonegap.ready'])
        .factory('cqContentSync', ['$q', '$http', 'phonegapReady', 
            function($q, $http, phonegapReady) {

                function initializeApplication(additionalFiles) {
                    var spec = {
                        additionalFiles: additionalFiles
                    };
                    var contentInitializer = contentInit(spec);

                    contentInitializer.initializeApplication(function callback(error, newLocation) {
                        if (error) {
                            console.error('initializeApplication error: [' + error + '].');
                            return;
                        }

                        // Truthy newLocation indicates initilization was successful
                        if (newLocation) {
                            window.location.href = newLocation;
                        }

                        // undefined `newLocation` indicates the app has already been initialized
                    });
                }

                function isAppInitialized() {
                    return CQ.mobile.contentUtils.isAppInitialized();
                }

                return {
                    initializeApplication: phonegapReady(initializeApplication),
                    isAppInitialized: isAppInitialized
                };
            }
        ]);
}(angular, document, CQ.mobile.contentInit));