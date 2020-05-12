/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2014-2016 Adobe Systems Incorporated
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

/* globals ContentSync */

/**
 * Functional constructor for CQ.mobile.contentUpdate. Assumes `deviceReady`
 * event has already fired.
 *
 * @param {object} spec Initialization options
 *
 * @param {string} [spec.id='default']
 *          Suffix to identify the default content package timestamp by
 *
 * @param {string} [spec.idPrefix]
 *         Prefix to prepend to the {@code spec.id} before invoking the content sync plugin.
 *
 * @param {string} [spec.isUpdateAvailableSuffix='.pge-updates.json']
 *          Selector and extension for querying if an update is available
 *
 * @param {string} [spec.updateExtension='.pge-updates.zip']
 *          Selector and extension for requesting an update payload
 *
 * @param {string} [spec.contentSyncModifiedSinceParam='?ifModifiedSince=']
 *          Query parameter for requesting content sync updates
 *
 * @param {string} [spec.contentSyncReturnRedirectPathParam='&returnRedirectZipPath=true']
 *          Query parameter for including `zipPath` in content sync update queries
 *
 * @param {string} [spec.manifestFilePath='/www/pge-package-update.json']
 *          JSON resource containing the package timestamp
 *
 * @param {object} [spec.requestHeaders]
 *          HTTP headers to include in each request
 *
 * @param {boolean} [spec.trustAllHosts=false]
 *          If set to true, it accepts all security certificates.
 *          This is useful because Android rejects self-signed security certificates.
 *          Not recommended for production use.
 *
 * @param {string} [spec.localStorageAppIdKey='pge.appId']
 *          Pull app ID from localStorage, if available
 *
 * @param {string} [spec.serverURL]
 *          URL of the server to use for checking for content package updates. If not defined, the
 *          'serverURL' defined in the local storage is used.
 *
 * @constructor
 */
CQ.mobile.contentUpdate = function(spec) {

    'use strict';

    spec = spec || {};

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

    // JSON resource containing the package timestamp and package updates
    var manifestFilePath = spec.manifestFilePath || '/www/pge-package-update.json';

    // HTTP headers to include in each request
    var requestHeaders = CQ.mobile.contentUtils.mergeRequestHeaders( spec.requestHeaders );

    // Optional parameter, defaults to false. If set to true, it accepts all
    // security certificates. This is useful because Android rejects self-signed
    // security certificates. Not recommended for production use.
    var trustAllHosts = spec.trustAllHosts || false;

    // Pull app ID from localStorage, if available
    var localStorageAppIdKey = spec.localStorageAppIdKey || 'pge.appId';

    // Unique identifier to reference the cached content
    var id = localStorage.getItem(localStorageAppIdKey) || spec.id || 'default';
    var idPrefix = spec.idPrefix || '';

    // List of deleted error files, for reporting
    var deletedErrorFileList = [];

    // Starting path for deleting files
    var localUrl;

    // List of files to compare to files to be deleted
    var packageFiles = [];

    /**
     * Update the content package identified by `name`.
     * @param {string} name - the name of the content package to update
     * @param {function} callback - called with two parameters: (error, result).
     *      Returns a path to content if successful, and an error otherwise.
     */
    var updateContentPackageByName = function(name, callback) {
        var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(name);

        if (!contentPackageDetails) {
            return callback('[contentUpdate] no contentPackageDetails set for name: [' + name + ']. Aborting.');
        }

        isContentPackageUpdateAvailable(name, function(error, isUpdateAvailable, zipPath) {
            if (error) {
                return callback(error);
            }

            if (isUpdateAvailable === false) {
                return callback('[contentUpdate] no update available: aborting.');
            }

            // Prepare URI to request update payload
            var updateServerURI = getServerURL(contentPackageDetails);
            var contentSyncUpdateURI = updateServerURI + contentPackageDetails.updatePath + updateExtension +
                contentSyncModifiedSinceParam + getContentPackageTimestamp(name);

            // Use exact path to zip if available
            if (zipPath) {
                contentSyncUpdateURI = updateServerURI + zipPath;
                console.log('[contentUpdate] using exact path to zip: [' + contentSyncUpdateURI + '].');
            }

            // Update app content using the ContentSync plugin
            var sync = ContentSync.sync({
                src: contentSyncUpdateURI,
                id: idPrefix + id,
                type: 'merge',
                headers: requestHeaders,
                trustHost: trustAllHosts
            });

            sync.on('complete', function(data) {
                var syncOperationComplete = function(error) {
                    if (error) {
                        return callback(error);
                    }

                    if (callback) {
                        var localContentPath = CQ.mobile.contentUtils.getPathToContent(window.location.href);
                        return callback(null, data.localPath + localContentPath);
                    }
                    else {
                        // For backwards compat: reload the current page in absence of a callback
                        console.log('[contentUpdate] no callback specified; reloading app' );
                        window.location.reload( true );
                    }
                };

                /**
                 * handler for overall success in deleting files
                 */
                var removeDeletedContentSuccess = function() {
                    console.log("[contentUpdate] Completed removal of unused files.");

                    updateLastUpdatedTimestamp(data.localPath, name, syncOperationComplete);
                };

                /**
                 * handler for overall success in deleting files
                 */
                var removeDeletedContentError = function() {

                    console.error("[contentUpdate] failed to remove the following unused files:");

                    for (var i = 0; i < deletedErrorFileList.length; i++) {
                        console.error("[contentUpdate] - " + deletedErrorFileList[i]);
                    }

                    updateLastUpdatedTimestamp(data.localPath, name, syncOperationComplete);
                };

                localUrl = 'file://' + data.localPath;
                initializePackageFiles(removeDeletedContentSuccess, removeDeletedContentError);
            });

            sync.on('error', function(e) {
                return callback(e);
            });
        });
    };

    /**
     * Determine if a content package update is available.
     * @param {string} name - the name of the content package to update
     * @param {function} callback - called with (null, true, zipPath) if a
     *      content package update is available, or if this content package
     *      has not yet been synced to this device. zipPath contains the exact
     *      path to the delta zip payload.
     */
    var isContentPackageUpdateAvailable = function(name, callback) {

        var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(name);

        if (contentPackageDetails) {
            // Check if the content package is already installed
            isContentPackageAlreadyInstalled(contentPackageDetails, function(isInstalled) {
                if (isInstalled === false) {
                    // Because this package is not installed, the next query should use a timestamp of 0.
                    // Update the timestamp to 0
                    contentPackageDetails.timestamp = 0;
                    CQ.mobile.contentUtils.storeContentPackageDetails(name, contentPackageDetails, true);
                }

                // Configure server endpoint from manifest details
                var updateServerURI = getServerURL(contentPackageDetails);

                var ck = '&' + (new Date().getTime());
                var updatePath = contentPackageDetails.updatePath;

                var contentSyncUpdateQueryURI = updateServerURI + updatePath + isUpdateAvailableSuffix +
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
            });
        }
        else {
            var errorMessage = 'No contentPackageDetails set for name: [' + name + ']. Aborting.';
            console.error('[contentUpdate] ' + errorMessage);
            return callback(errorMessage);
        }
    };

    /*
     * Private helpers
     */
    var updateLastUpdatedTimestamp = function(path, contentPackageName, callback) {
        var cacheKiller = '?ck=' + (new Date().getTime());

        // Fetch updated timestamp from filesystem
        CQ.mobile.contentUtils.getJSON(path + manifestFilePath + cacheKiller, function(error, data) {
            if (error) {
                return callback(error);
            }

            var newTimestamp = parseInt(data.lastModified);

            console.log('[contentUpdate] recording timestamp: [' + newTimestamp + '] under the content package manifest named [' + contentPackageName + ']');

            // Update stored timestamp for this content package
            var contentPackageDetails = CQ.mobile.contentUtils.getContentPackageDetailsByName(contentPackageName);
            contentPackageDetails.timestamp = newTimestamp;
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

    /**
     * Returns the server URL of the package details.
     * The URL can be overridden by the spec.serverURL property.
     * @param {object} packageDetails The package details from the local storage
     * @returns {string}
     */
    var getServerURL = function(packageDetails) {
        // check if spec wants to override the url
        var url = spec.serverURL || packageDetails.serverURL;

        // remove trailing slash
        if (url.charAt(url.length-1) === '/') {
            url = url.substring(0, url.length - 1);
        }

        return url;
    };

    /**
     * Populate the packageFiles array with a list of filename from the pge-package-update.json file,
     * first prepending them with '/www/' to facilitate matching with the pge_deletions file.
     */
    var initializePackageFiles = function(successCallback, failureCallback) {
        if (packageFiles && (Array === packageFiles.constructor) && (packageFiles.length > 0)) {
            removeDeletedContent(successCallback, failureCallback);
        } else {
            window.resolveLocalFileSystemURL(localUrl + manifestFilePath, function (fileEntry) {
                CQ.mobile.contentUtils.getJSON(fileEntry.toURL(), function (error, jsonData) {
                    if (jsonData && jsonData.files) {
                        packageFiles = jsonData.files;
                        // For each packageFile file, prepend it with '/www/'
                        packageFiles.forEach(function(item, index) {
                            packageFiles[index] = '/www/' + item;
                        });
                    }
                    removeDeletedContent(successCallback, failureCallback);
                }, function (error) {
                    console.error('[contentUpdate] Error reading the ' + manifestFilePath + ' file.  Error Code: ' + error.code);
                    removeDeletedContent(successCallback, failureCallback);
                });
            }, function (error) {
                console.error('[contentUpdate] Error resolving the ' + manifestFilePath + ' file.  Error Code: ' + error.code);
                removeDeletedContent(successCallback, failureCallback);
            });

        }
    };

    /**
     * Read and handle the files in the deletion directory.
     * There could be zero, one, or several such files.  Each one contains in json a list of files to delete.
     */
    var removeDeletedContent = function(successCallback, failureCallback) {
        console.log('[contentUpdate] Looking for files to remove, in ' + localUrl + '/www/pge-deletions');

        window.resolveLocalFileSystemURL(localUrl + '/www/pge-deletions', function(dirEntry) {
            // Empty error file list in case it's not empty.
            deletedErrorFileList = [];
            var directoryReader = dirEntry.createReader();

            console.log('[contentUpdate] Reading pge_deletions files.');
            directoryReader.readEntries(function(entries){
                readDeletionFiles(entries, successCallback, failureCallback);
            },
                function (error) {
                console.error('[contentUpdate] Error reading deletion directory.  Error Code: ' + error.code);
            });
        }, function(error) {
            console.log('[contentUpdate] No pge-deletions folder in ' + localUrl + '/www.  Error Code: ' + error.code);
            return successCallback();
        });
    };


    /**
     * Given a list of deletion files (FileEntries), recursively read the content of each file, and act on it.
     */
    var readDeletionFiles = function(entries, successCallback, failureCallback) {

        if (entries.length === 0) {
            if (deletedErrorFileList.length === 0) {
                return successCallback();
            } else {
                return failureCallback();
            }
        }

        var deletionFile = entries.pop();
        if (deletionFile.isFile && deletionFile.name.match(/pge_deletions_.*\.json/)) {

            console.log('[contentUpdate] Reading pge_deletions file: ' + deletionFile.name);
            CQ.mobile.contentUtils.getJSON(deletionFile.toURL(), function (error, jsonData) {
                if (jsonData && jsonData.files) {
                    removeFiles(jsonData.files, deletionFile, entries, successCallback, failureCallback);
                }
            }, null);
        } else {
            readDeletionFiles(entries, successCallback, failureCallback);
        }
    };

    /**
     * Given a list of files to delete, delete one and then recursively delete the rest
     * (each file is a string).  When done, remove the deletion file.
     */
    var removeFiles = function(files, deletionFileEntry, entries, successCallback, failureCallback) {
        var deleteFile = function(files) {
            if (files.length === 0) {
                console.log("[contentUpdate] " + deletionFileEntry.name + ": content files processed for removal.");

                // Once finished, remove the deletion file
                deletionFileEntry.remove(function() {
                    console.log('[contentUpdate] Removed ' + deletionFileEntry.name);
                    readDeletionFiles(entries, successCallback, failureCallback);
                }, function(error) {
                    console.error('[contentUpdate] Could not remove deletion file: ' + deletionFileEntry.name + '.  Error Code: ' + error.code);
                    readDeletionFiles(entries, successCallback, failureCallback);
                });
            } else {

                var file = files.pop();
                window.resolveLocalFileSystemURL(localUrl + file, function (fileEntry) {
                    if (packageFiles.indexOf(file) < 0) {
                        fileEntry.remove(function () {
                            console.log('[contentUpdate] Successfully removed ' + localUrl + file);
                            deleteFile(files);
                        }, function (error) {
                            console.error('[contentUpdate] Could not remove ' + localUrl + file + '.  Error Code: ' + error.code);
                            deletedErrorFileList.push(file);
                            deleteFile(files);
                        });
                    } else {
                        console.log('[contentUpdate] Did not remove ' + localUrl + file +
                            ' because it is included in the latest update');
                        deleteFile(files);
                    }
                }, function (error) {
                    console.error('[contentUpdate] Could not find ' + localUrl + file + '.  Error Code: ' + error.code);
                    deleteFile(files);
                });
            }
        };

        // start recursion
        deleteFile(files);
    };

    /**
     * Check if the given content package is already installed.
     * @param {object} packageDetails The package details from local storage
     * @returns {boolean}
     */
    var isContentPackageAlreadyInstalled = function(packageDetails, callback) {
        var relativePathToHtmlContent = packageDetails.path.substring(1) + '.html';

        console.log('[contentUpdate] looking for existing content for package: [' +
        packageDetails.name + '] at path: [' + relativePathToHtmlContent + '].');

        var absolutePathToHtmlContent = CQ.mobile.contentUtils.getPathToWWWDir(window.location.href) +
            relativePathToHtmlContent;

        window.resolveLocalFileSystemURL(absolutePathToHtmlContent,
            function success() {
                console.log('[contentUpdate] package [' + packageDetails.name + '] ' +
                'root detected: package is already installed.');
                callback(true);
            },
            function fail() {
                console.log('[contentUpdate] package [' + packageDetails.name + '] ' +
                'is NOT already installed.');
                callback(false);
            }
        );
    };



    // Exported functions
    var that = {
        updateContentPackageByName: updateContentPackageByName,
        isContentPackageUpdateAvailable: isContentPackageUpdateAvailable
    };

    return that;
};
