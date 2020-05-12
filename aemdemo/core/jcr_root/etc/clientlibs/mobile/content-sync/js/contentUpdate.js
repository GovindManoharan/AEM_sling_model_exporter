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

/**
 * @deprecated.  This code is deprecated as of 6.3.  Please use the equivalent in content-sync-2.
 */

/**
 * Functional constructor for CQ.mobile.contentUpdate. Assumes `deviceReady`
 * event has already fired.
 */
CQ.mobile.contentUpdate = function(spec) {

    'use strict';

    spec = spec || {};

    // Name to store the .zip update on the device file system
    var localZipName = spec.localZipName || 'content-sync-update-payload.zip';

    // Selector and extension for querying if an update is available
    var isUpdateAvailableSuffix = spec.isUpdateAvailableSuffix || '.pge-updates.json';

    // Extension for requesting an update payload
    // '' (empty string) is acceptable, so our check must be more specific
    var updateExtension = spec.updateExtension;
    if (typeof updateExtension === 'undefined' || updateExtension === null) {
        updateExtension = '.pge-updates.zip';
    }

    // Query parameter for requesting content sync updates
    var contentSyncModifiedSinceParam = spec.contentSyncModifiedSinceParam || '?ifModifiedSince=';

    // Query parameter for including `zipPath` in content sync update queries
    var contentSyncReturnRedirectPathParam = spec.contentSyncReturnRedirectPathParam || '&returnRedirectZipPath=true';

    // JSON resource containing the package timestamp
    var manifestFilePath = spec.manifestFilePath || '/www/pge-package-update.json';

    // Server location for requesting updates from
    var serverURI;

    // HTTP headers to include in each request
    var requestHeaders = CQ.mobile.contentUtils.mergeRequestHeaders( spec.requestHeaders );

    // Optional parameter, defaults to false. If set to true, it accepts all
    // security certificates. This is useful because Android rejects self-signed
    // security certificates. Not recommended for production use.
    var trustAllHosts = spec.trustAllHosts || false;

    /**
     * Update the content package identified by `name`.
     * @param {string} name - the name of the content package to update
     * @param {function} callback - called with two parameters: (error, result).
     *      Returns a path to content if successful, and an error otherwise. 
     */
    var updateContentPackageByName = function(name, callback) {
        console.warn('[contentUpdate] content-sync\'s contentUpdate.js is deprecated.  Please use content-sync-2 Javascript functions.');
        var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(name);
        
        if (contentPackageDetails) {
            // Configure server endpoint from manifest details
            setServerURI( contentPackageDetails.serverURL );

            var destination = CQ.mobile.contentUtils.getPathToContent(window.location.href);

            downloadContentPackage(contentPackageDetails.updatePath, name, destination,
                function(error, result) {
                    if (error && callback) {
                        return callback(error);
                    }

                    if (callback) {
                        return callback(null, result);
                    } else {
                        // For backwards compat: reload the current page in absence of a callback
                        console.log( '[contentUpdate] no callback specified; reloading app' );
                        window.location.reload( true );
                    }
                }
            );
        }
        else {
            var errorMessage = 'no contentPackageDetails set for name: [' + name + ']. Aborting.';
            if (callback) {
                return callback(errorMessage);
            } else {
                console.error('[contentUpdate] ' + errorMessage);
            }
        }
    };

    /**
     * Determine if a content package update is available.
     * @param {string} name - the name of the content package to update
     * @return {function} callback - called with (null, true, zipPath) if a
     *      content package update is available, or if this content package
     *      has not yet been synced to this device. zipPath contains the exact
     *      path to the delta zip payload.
     */
    var isContentPackageUpdateAvailable = function(name, callback) {

        var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(name);
        
        if (contentPackageDetails) {
            // Configure server endpoint from manifest details
            setServerURI( contentPackageDetails.serverURL );

            var ck = '&' + (new Date().getTime());
            var updatePath = contentPackageDetails.updatePath;

            var contentSyncUpdateQueryURI = serverURI + updatePath + isUpdateAvailableSuffix +
                    contentSyncModifiedSinceParam + getContentPackageTimestamp(name) + ck +
                    contentSyncReturnRedirectPathParam;

            console.log('[contentUpdate] querying for update with URI: [' + contentSyncUpdateQueryURI + '].');

            CQ.mobile.contentUtils.getJSON(contentSyncUpdateQueryURI, function(error, data) {
                if (error) {
                    return callback(error);
                }

                if (data.updates === true && data.zipPath) {
                    console.log('[contentUpdate] update is available for [' + name + '] at the following location: [' + data.zipPath + '].');
                    return callback(null, true, data.zipPath);
                }
                else if (data.updates === true) {
                    console.log('[contentUpdate] update is available for [' + name + '].');
                    return callback(null, true);
                }
                else {
                    console.log('[contentUpdate] NO update is available for [' + name + '].');
                    return callback(null, false);
                }
            },
            requestHeaders);
        }
        else {
            var errorMessage = 'No contentPackageDetails set for name: [' + name + ']. Aborting.';
            console.error('[contentUpdate] ' + errorMessage);
            return callback(errorMessage);
        }
    };

    /**
     * Download and install content for the given content package.
     * @param {string} contentSyncPath - path to the content sync config node
     * @param {string} contentPackageName - the name of the content package to update
     * @param {string} contentPackageRootPage - root page of this content package
     * @param {function} callback - called with two parameters: (error, result)
     */
    var downloadContentPackage = function(contentSyncPath, contentPackageName, contentPackageRootPage, callback) {
        console.warn('[contentUpdate] content-sync\'s contentUpdate.js is deprecated.  Please use content-sync-2 Javascript functions.');
        CQ.mobile.contentUtils.requestFileSystemRoot(function(error, fileSystemRoot) {
            if (error) {
                return callback(error);
            }

            // Put together the content sync update URI
            var contentSyncUpdateURI = serverURI + contentSyncPath + updateExtension +
                contentSyncModifiedSinceParam + getContentPackageTimestamp(contentPackageName);

            // Attempt to discover the exact zip location to avoid a 302 redirect
            isContentPackageUpdateAvailable(contentPackageName, function(error, isUpdateAvailable, zipPath) {
                if (error) {
                    return callback(error);
                }

                if (isUpdateAvailable === false) {
                    return callback('[contentUpdate] no update available: aborting.');
                }

                if (zipPath) {
                    // Use the exact path to the zip instead of querying 'ifModifiedSince'
                    contentSyncUpdateURI = serverURI + zipPath;
                    console.log('[contentUpdate] using exact path to zip: [' + contentSyncUpdateURI + '].');
                }

                var encodedContentSyncURI = encodeURI( contentSyncUpdateURI );

                var destinationURI = fileSystemRoot.toURL() + CQ.mobile.contentUtils.getDeployPath() + "/" + localZipName;

                var updateAppliedCallback = function(error) {
                    if (error) {
                        return callback(error);
                    }

                    // else: successfully applied the content payload.
                    var contentPackageEntryFullPath = CQ.mobile.contentUtils.getPathToWWWDir(window.location.href) + contentPackageRootPage;
                    console.log('[contentUpdate] successfully applied the content payload. ');
                    console.log('[contentUpdate] returning path to its entry point: [' + contentPackageEntryFullPath + ']');

                    // return the contentPackageRootPage URI.
                    if (callback) {
                        return callback(null, contentPackageEntryFullPath);
                    }

                    return;
                };

                var fileDownloadSuccess = function(entry) {
                    console.log( '[contentUpdate] successfully downloaded to: ' + entry.fullPath );
                    entry.getParent(function(parent) {
                        // Apply the update to the existing content
                        applyUpdate(entry, parent, contentPackageName, updateAppliedCallback);
                    });
                };
                var fileDownloadError = function(error) {
                    if (error.http_status == 304) {
                        console.log('[contentUpdate] server returned a 304 (Not Modified).');
                        // Not modified. Nothing has changed - no update to apply.
                        return callback();
                    }

                    // A status code other than 304 has been returned
                    var errorMessage = '[contentUpdate] file download error: ' +
                        CQ.mobile.contentUtils.getFileRelatedErrorMessage(error);
                    console.error(errorMessage);
                    return callback(errorMessage);
                };

                console.log( '[contentUpdate] requesting file: ' + encodedContentSyncURI );

                var fileTransfer = new FileTransfer();

                // Begin download
                fileTransfer.download(
                    encodedContentSyncURI,
                    destinationURI,
                    fileDownloadSuccess,
                    fileDownloadError,
                    trustAllHosts,
                    {
                        headers: requestHeaders
                    }
                );
            });
        });
    };

    /*
     * Private helpers
     */
    var applyUpdate = function(zipFileEntry, destinationEntry, contentPackageName, callback) {

        var removeUpdatePayloadSuccess = function() {
            console.log( '[contentUpdate] successfully removed the update payload' );

            updateLastUpdatedTimestamp(destinationEntry.nativeURL, contentPackageName, function(error) {
                if (error) {
                    return callback(error);
                }
                // else
                callback();
            } );
        };

        var removeUpdatePayloadError = function( error ) {
            var errorMessage = '[contentUpdate] error: failed to remove update payload. ' +
                    CQ.mobile.contentUtils.getFileRelatedErrorMessage(error);
            console.error(errorMessage);
            return callback(errorMessage);
        };

        zip.unzip(zipFileEntry.toURL(), destinationEntry.toURL(), function(statusCode) {
            if(statusCode === 0) {
                console.log( '[contentUpdate] successfully extracted the update payload.' );
                zipFileEntry.remove(removeUpdatePayloadSuccess, removeUpdatePayloadError);
            }
            else {
                var errorMessage = '[contentUpdate][ERROR]: failed to extract update payload with status: [' + statusCode + '].';
                console.error(errorMessage);
                return callback(errorMessage);
            }
        });
    };

    var updateLastUpdatedTimestamp = function(path, contentPackageName, callback) {
        var cacheKiller = '?ck=' + (new Date().getTime());

        // Fetch updated timestamp from filesystem
        CQ.mobile.contentUtils.getJSON(path + manifestFilePath + cacheKiller, function(error, data) {
            if (error) {
                return callback(error);
            }

            // Add 5 seconds to the timestamp to ensure the value is > the recorded contentsync time
            var incrementedTimestamp = parseInt(data.lastModified);

            console.log('[contentUpdate] recording timestamp: [' + incrementedTimestamp + '] under the content package manifest named [' + contentPackageName + ']');
            
            // Update stored timestamp for this content package
            var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(contentPackageName);
            contentPackageDetails.timestamp = incrementedTimestamp;
            CQ.mobile.contentUtils.storeContentPackageDetails(contentPackageName, contentPackageDetails);

            return callback();
        });
    };

    var getContentPackageTimestamp = function(contentPackageName) {
        var packageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(contentPackageName);
        var timestamp = packageDetails.timestamp;
        // If timestamp has not yet been set, return 0
        return timestamp || 0;
    };

    var setServerURI = function( newServerURI ) {
        // If the newServerURI ends with a /, remove it
        if (newServerURI.indexOf('/', newServerURI.length -1) !== -1) {
            newServerURI = newServerURI.substring(0, newServerURI.length -1);
            }
        serverURI = newServerURI;
    };

    // Exported functions
    var that = {
        updateContentPackageByName: updateContentPackageByName,
        downloadContentPackage: downloadContentPackage,
        isContentPackageUpdateAvailable: isContentPackageUpdateAvailable
    };

    return that;
};
