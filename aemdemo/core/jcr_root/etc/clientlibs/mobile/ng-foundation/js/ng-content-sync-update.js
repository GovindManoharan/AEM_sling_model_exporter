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
;(function( angular, contentUpdate, contentUtils, undefined ) {

    "use strict";

    /**
     * Fetches and applies an AEM content sync delta update to the app.
     */
    angular.module( 'cqContentSyncUpdate', ['btford.phonegap.ready'] )
        .factory( 'cqContentSyncUpdate', ['$window', '$http', 'phonegapReady',
            function($window, $http, phonegapReady) {

                var configOptions = {};

                // Optional. Available for backwards compatibility
                function setContentSyncUpdateConfiguration( contentSyncUpdateURI ) {
                    var parser = document.createElement('a');
                    parser.href = contentSyncUpdateURI;

                    // Separate serverURI from contentSyncPath
                    configOptions.serverURI = parser.protocol + '//' + parser.host;
                    configOptions.contentSyncPath = parser.pathname;
                    // contentSyncPath includes '.zip'
                    configOptions.updateExtension = '';
                }

                // @deprecated
                function fetchAndApplyDeltaUpdate(spec, callback) {
                    spec = spec || {};

                    // Use spec if available, falling back to configOptions
                    spec.serverURI = spec.serverURI || configOptions.serverURI;
                    spec.updateExtension = spec.updateExtension || configOptions.updateExtension;
                    
                    var contentSyncPath = spec.contentSyncPath || configOptions.contentSyncPath;
                    var countryAndLocaleCode = spec.countryAndLocaleCode || 'default';

                    var localeRootPage = contentUtils.getPathToContent(window.location.href);

                    var contentUpdater = contentUpdate(spec);
                    contentUpdater.downloadContentPackage(contentSyncPath, countryAndLocaleCode, localeRootPage,
                        function(error, result) {
                            if (error && callback) {
                                return callback(error);
                            }

                            if (callback) {
                                return callback(null, result)
                            } else {
                                // For backwards compat: reload the current page in absence of a callback
                                console.log( 'No callback specified; reloading app' );
                                window.location.reload( true );
                            }
                        }
                    );
                }

                /*
                 * Exported methods
                 */
                return {
                    // Configure app updater
                    setContentSyncUpdateConfiguration: setContentSyncUpdateConfiguration,

                    // Perform content sync update
                    fetchAndApplyDeltaUpdate: phonegapReady(fetchAndApplyDeltaUpdate)
                };
            }
        ]);
}( angular, CQ.mobile.contentUpdate, CQ.mobile.contentUtils ));