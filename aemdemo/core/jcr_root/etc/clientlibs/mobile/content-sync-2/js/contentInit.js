/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2014-2015 Adobe Systems Incorporated
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
 * Functional constructor for CQ.mobile.contentInit. Assumes `deviceready` 
 * event has already fired.
 *
 * @constructor
 *
 * @param {object} spec Initialization options
 * @param {string} [spec.manifestFileName='pge-package.json']
 *          Name of the package manifest JSON.
 *          The manifest contains a list of files to include in initialization
 *
 * @param {string} [spec.contentPackagesFileName='pge-content-packages.json']
 *          Name of the content packages JSON.
 *          Resource containing a list of content sync packages included in the payload.
 *
 * @param {string} [spec.id='default']
 *          Unique identifier to reference the cached content
 *
 * @param {string} [spec.idPrefix]
 *         Prefix to prepend to the {@code spec.id} before invoking the content sync plugin.
 */
CQ.mobile.contentInit = function(spec) {

    'use strict';

    spec = spec || {};

    // JSON resource containing a list of files to include in initialization
    // process
    var manifestFileName = spec.manifestFileName || 'pge-package.json';

    // JSON resource containing a list of content sync packages included in 
    // the payload
    var contentPackagesFileName = spec.contentPackagesFileName || 'pge-content-packages.json';

    // Location of the current resource 
    var currentLocation = window.location.href;

    // Suffix to identify the default content package timestamp by  
    var defaultContentPackageTimestampSuffix = 'default';

    // Last modified timestamp as read from pge-package.json
    var lastModifiedTimestamp;

    // Unique identifier to reference the cached content
    var id = spec.id || 'default';
    var idPrefix = spec.idPrefix || '';

    /**
     * Perform app initialization. Once complete, the app will be ready to
     * receive updates over-the-air via Content Sync.
     * @param {function} callback - called with two parameters: (error, result)
     */
    var initializeApplication = function(callback) {

        console.log('[contentInit] determine if initial app copy needs to occur');
        console.log('[contentInit] current location: [' + currentLocation + ']');

        var readManifestFile = function(callback) {
            var manifestFilePath = CQ.mobile.contentUtils.getPathToWWWDir(currentLocation) + manifestFileName;
            console.log('[contentInit] manifest being read from: [' + manifestFilePath + ']');
            // Read from the manifest
            getDataFromManifest(manifestFilePath, callback);
        };

        var contentCopyCallback = function(error, pathToAppEntryPoint) {
            if (error) {
                return callback(error);
            }

            // Content copy has completed! Record the last modified timestamp
            // Kept around for backwards compatibility
            recordLastModifiedTimestamp(CQ.mobile.contentUtils.contentPackageDetailsKeyPrefix + defaultContentPackageTimestampSuffix,
                lastModifiedTimestamp);

            // Record the individual content package timestamps, if available
            recordContentPackageTimestamps(lastModifiedTimestamp, function(error) {
                    if (error) {
                        return callback(error);
                    }
                    callback(null, pathToAppEntryPoint);
                }
            );
        };

        // Check if app is running in LocalFileSystem.PERSISTENT directory
        var manifestDigestCallback;
        if (CQ.mobile.contentUtils.isAppRunningInSandbox()) {
            console.log('[contentInit] app is running in sandbox: no content copy necessary.');
            var wwwDirPath = CQ.mobile.contentUtils.getPathToWWWDir(currentLocation);

            if (CQ.mobile.contentUtils.isPackageDataStored() === false) {
                manifestDigestCallback = function(error, manifestData) {
                    if (error) {
                        //still allow app to complete initialization - callbacks to server just won't work
                        recordAppInitializedFlag(true);
                        return callback(null, wwwDirPath);
                    }

                    // Store the overall lastModifiedTimestamp for later
                    lastModifiedTimestamp = manifestData.lastModified;
                    console.log('[contentInit] lastModifiedTimestamp is [' + lastModifiedTimestamp + '].');

                    return contentCopyCallback(null, wwwDirPath);
                };

                console.log('[contentInit] package data is missing. recording content package data from manifest.');
                //record timestamps from manifest
                readManifestFile(manifestDigestCallback);
            }
            else {
                return callback(null, wwwDirPath);
            }
        }
        else {
            manifestDigestCallback = function(error, manifestData) {
                if (error) {
                    return contentCopyCallback(error);
                }

                // Store the overall lastModifiedTimestamp for later
                lastModifiedTimestamp = manifestData.lastModified;

                // Begin app ContentSync initialization
                var sync = ContentSync.sync({
                    type: 'local',
                    id: idPrefix + id + '/www',
                    copyRootApp: true,
                    manifest: manifestFileName
                });

                sync.on('complete', function(data) {
                    return contentCopyCallback(null, data.localPath);
                });

                sync.on('error', function(e) {
                    return contentCopyCallback(e);
                });
            };

            readManifestFile(manifestDigestCallback);
        }
    };


    var getDataFromManifest = function(manifestFilePath, callback) {
        // read files from manifest
        CQ.mobile.contentUtils.getJSON(manifestFilePath, function(error, data) {
            if (error) {
                return callback(error);
            }

            return callback(null, data);
        });
    };

    var recordLastModifiedTimestamp = function(key, timestamp) {
        // Add 5 seconds to the timestamp to ensure the value is > the recorded contentsync time
        var incrementedTimestamp = parseInt(timestamp);
        console.log('[contentInit] recording last modified timestamp: [' + incrementedTimestamp + ']');
        localStorage.setItem(key, incrementedTimestamp);
    };

    var recordAppInitializedFlag = function(value) {
        localStorage.setItem(CQ.mobile.contentUtils.isAppInitializedKey, value);
    };

    var recordContentPackageTimestamps = function(defaultTimestamp, callback) {
        // Read from the file identified by `contentPackagesFileName`
        var manifestFilePath = CQ.mobile.contentUtils.getPathToWWWDir(currentLocation) + contentPackagesFileName;
        getDataFromManifest(manifestFilePath, function(error, data) {
            if (error) {
                console.log('[contentInit] unable to read the content packages manifest: [' + contentPackagesFileName + '].');
                return callback(error);
            }
            var serverURL = CQ.mobile.contentUtils.getServerURL() || data.serverURL;
            if (data && data.content) {
                for (var i = 0; i < data.content.length; i++) {
                    var manifestEntry = data.content[i];
                    // Set the timestamp & serverURL to that of the uber package
                    manifestEntry.timestamp = defaultTimestamp;
                    manifestEntry.serverURL = serverURL;
                    // Record the content package details for each manifest entry
                    CQ.mobile.contentUtils.storeContentPackageDetails(manifestEntry.name, manifestEntry);
                }
            }

            // Set flag indicating the app is initialized
            recordAppInitializedFlag(true);
            callback();
        });
    };

    // Exported functions
    var that = {
        initializeApplication: initializeApplication
    };

    return that;
};
