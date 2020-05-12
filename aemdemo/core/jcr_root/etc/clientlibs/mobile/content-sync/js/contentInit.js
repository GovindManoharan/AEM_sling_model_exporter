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
 * Functional constructor for CQ.mobile.contentInit. Assumes `deviceready` 
 * event has already fired.
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

    // Additional files to include in initialization process, such as .js
    // resources injected by Cordova plugins 
    var additionalFiles = spec.additionalFiles || [];

    // Location of the current resource 
    var currentLocation = window.location.href;

    // Suffix to identify the default content package timestamp by  
    var defaultContentPackageTimestampSuffix = 'default';

    // Last modified timestamp as read from pge-package.json
    var lastModifiedTimestamp;

    /**
     * Perform app initialization. Once complete, the app will be ready to
     * receive updates over-the-air via Content Sync.
     * @param {function} callback - called with two parameters: (error, result)
     */
    var initializeApplication = function(callback) {

        console.warn('[contentInit] content-sync\'s contentInit.js is deprecated.  Please use content-sync-2 Javascript functions.');
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
        if (CQ.mobile.contentUtils.isAppRunningInSandbox()) {
            console.log('[contentInit] app is running in sandbox: no content copy necessary.');
            
            if (CQ.mobile.contentUtils.isPackageDataStored() === false) {
                var manifestDigestCallback = function(error, manifestData) {
                    if (error) {
                        //still allow app to complete initialization - callbacks to server just won't work
                        recordAppInitializedFlag(true);
                        return callback(null, currentLocation);
                    }

                    // Store the overall lastModifiedTimestamp for later
                    lastModifiedTimestamp = manifestData.lastModified;
                    console.log('[contentInit] lastModifiedTimestamp is [' + lastModifiedTimestamp + '].');

                    contentCopyCallback(null, currentLocation);
                };

                console.log('[contentInit] package data is missing. recording content package data from manifest.');
                //record timestamps from manifest
                readManifestFile(manifestDigestCallback);
            }
            else {
                return callback();
            }
        }
        else {
            // App is NOT running in LocalFileSystem.PERSISTENT directory
            CQ.mobile.contentUtils.requestFileSystemRoot(function(error, fileSystemRoot) {
                if (error) {
                    var errorMessage = '[contentInit][ERROR] ' + error;
                    console.error(errorMessage);
                    return callback(errorMessage);
                }

                console.log('[contentInit] successfully gained access to the file system');

                // Check to see if there already exists an up-to-date copy of the content
                checkForUpToDateContentCopy(function(error, hasUpToDateContentCopy) {
                    if (error) {
                        return callback(error);
                    }

                    if (hasUpToDateContentCopy) {
                        // Content on device is current.
                        // Redirect to local file system path
                        var redirectTo = fileSystemRoot.toURL() + getAppEntryPoint();
                        callback(null, redirectTo);
                    }
                    else {
                        var manifestDigestCallback = function(error, manifestData) {
                            if (error) {
                                return contentCopyCallback(error);
                            }

                            // Combine the list of files in the manifest with those provided
                            // to the constructor as additionalFiles.
                            var fileList = manifestData.files;
                            if ((fileList instanceof Array) === false) {
                                return callback('[contentInit][ERROR] manifest did not contain a list of files.');
                            }

                            if (additionalFiles instanceof Array) {
                                fileList = fileList.concat(additionalFiles);
                            }

                            // Store the overall lastModifiedTimestamp for later
                            lastModifiedTimestamp = manifestData.lastModified;

                            // Copy the master list of files to the PERSISTENT directory
                            performInitialContentCopy(fileSystemRoot, fileList, contentCopyCallback);
                        };

                        // Content on device is out-of-date
                        readManifestFile(manifestDigestCallback);
                    }
                });
            });
        }
    };

    /*
     * Private helpers
     */
    var checkForUpToDateContentCopy = function(callback) {
        var relativePathToAppEntryPoint = getAppEntryPoint();

        console.log('[contentInit] checking for up-to-date content');

        var appPayloadManifestFilePath = CQ.mobile.contentUtils.getPathToWWWDir(currentLocation) + manifestFileName;
        console.log('[contentInit] manifest being read from: [' + appPayloadManifestFilePath + ']');
        
        // Read from the manifest
        getDataFromManifest(appPayloadManifestFilePath, function(error, data) {
            if (error) {
                return callback(error);
            }

            var newTimestamp = data.lastModified;
            var currentTimestamp = localStorage.getItem(CQ.mobile.contentUtils.contentPackageDetailsKeyPrefix + defaultContentPackageTimestampSuffix);
            console.log('[contentInit] comparing the current timestamp [' + currentTimestamp + ']' +
                'with the new timestamp [' + newTimestamp + '].');
            
            if (currentTimestamp === null || currentTimestamp.length === 0) {
                console.log('[contentInit] first run of the app on this device. initiating contentInit.');
                // Content on device is NOT up-to-date; return false
                callback(null, false);
            }
            else {
                // We have a current timestamp meaning the app has run before.
                // Determine if we have newer content in the app payload.
                newTimestamp = parseInt(newTimestamp);
                currentTimestamp = parseInt(currentTimestamp);
                if (newTimestamp > currentTimestamp) {
                    console.log('[contentInit] new content (timestamp: [' + newTimestamp + ']) will overwrite the current (timestamp: [' + currentTimestamp + ']).');
                    // Content on device is NOT up-to-date; return false
                    callback(null, false);
                }
                else {
                    console.log('[contentInit] content on device is up-to-date (timestamp: [' + newTimestamp + ']). skipping contentInit.');
                    // Content on device IS up-to-date; return true
                    callback(null, true);
                }
            }
        });
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

    // Copy ALL app content to the PERSISTENT location
    var performInitialContentCopy = function(fileSystemRoot, fileList, callback) {
        console.log('[contentInit] sandbox directory root: [' + fileSystemRoot.toURL() + ']');
        
        fileSystemRoot.getDirectory('www', {create: true},
            // On success, pass the www/ dir to copyFilesToDirectory
            function success(wwwDir) {
                console.log('[contentInit] CREATED the www directory');

                var copyCompleteCallback = function() {
                    // Now, return the path to the app entry point in the new location
                    var redirectTo = fileSystemRoot.toURL() + getAppEntryPoint();
                    console.log('[contentInit] complete! Returning app entry point: [' + redirectTo + ']');
                    
                    // Callback with the app entry point
                    callback(null, redirectTo);
                };

                // First, copy the list of files specified by pge-package.json
                copyFilesToWritableDirectory(fileList, wwwDir, copyCompleteCallback);
            }, 
            // Callback will be invoked on error
            callback
        );
    };

    var copyFilesToWritableDirectory = function(fileList, destinationDirectoryEntry, callback) {
        var totalFileCount = fileList.length,
            copyCount = 0,
            pathToWWWDir = CQ.mobile.contentUtils.getPathToWWWDir(currentLocation);
        
        var copyFiles = function() {
            if (fileList.length === 0) {
                console.log('[contentInit] successfully copied ' + copyCount + ' of ' + totalFileCount + ' files.');
                callback();
                return;
            }

            var relativePathToFile = fileList.shift();
            var absolutePathToFile = pathToWWWDir + relativePathToFile;

            createPath(destinationDirectoryEntry, relativePathToFile, function callback() {
                destinationDirectoryEntry.getFile(relativePathToFile, {create: true},
                    function(newFile) {
                        console.log('[contentInit] successfully CREATED the new file: [' + newFile.name + ']');

                        var fileTransfer = new FileTransfer();
                        console.log('[contentInit] copying file from: [' + absolutePathToFile + '] to: [' + newFile.fullPath + ']');
                        fileTransfer.download(
                            absolutePathToFile,
                            newFile.toURL(),
                            function() {
                                //copy success
                                copyCount++;
                                console.log('[contentInit] successfully COPIED the new file: [' + newFile.name + ']');
                                copyFiles(fileList);
                            },
                            function(error) {
                                console.log('[contentInit][ERROR] failed to COPY the new file: [' + relativePathToFile +
                                    '] error code: [' + error.code + '] source: [' + error.source +
                                    '] target: [' + error.target + '] http_status: [' + error.http_status + ']');
                                copyFiles(fileList);
                            }
                        );
                    },
                    function(error) {
                        console.log('[contentInit][ERROR] failed to GET a handle on the new file: [' + relativePathToFile + '] error code: [' + error.code + ']');
                        copyFiles(fileList);
                    }
                );
            });
        };

        copyFiles(fileList);
    };

    function createPath(directoryEntry, filename, callback) {

        var parentDirectories = filename.split("/");
        if (parentDirectories.length === 1) {
            // There are no directories in this path
            callback();
        }
        else {
            var dirs = [];
            for (var i=1; i<parentDirectories.length; i++) {
                dirs.push(parentDirectories.slice(0, i).join("/"));
            }

            var setupPath = function(dirs) {
                if (dirs.length === 0) {
                    console.log("[contentInit] done creating directories");
                    callback();
                    return;
                }

                var path = dirs.shift();
                directoryEntry.getDirectory(path, { create: true, exclusive: true },
                    function () {
                        console.log('[contentInit] Created directory [' + path + '].');
                        setupPath(dirs);
                    },
                    function(error) {
                        // error in this case means the directory already exists.
                        setupPath(dirs);
                    });
            };

            // fire it up
            setupPath(dirs);
        }
    };

    var getAppEntryPoint = function() {
        var pathName = window.location.pathname;
        return pathName.substring(pathName.indexOf('www/'));
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

    var fileSystemError = function(error) {
        var errorCode = error.code || 'NO_CODE_AVAILABLE';
        console.error('[contentInit][ERROR] FileError with code [' + errorCode + '].');
    };

    var filesystemRedirect = function(path) {
        window.location.href = path;
    };

    // Exported functions
    var that = {
        initializeApplication: initializeApplication
    };

    return that;
};
