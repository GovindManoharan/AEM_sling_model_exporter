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

/* globals LocalFileSystem */

/**
 * Utility for dealing with Content Sync updates.
 */
CQ.mobile.contentUtils = {

    // Key prefix used to store content package details in localStorage
    contentPackageDetailsKeyPrefix: 'cq.mobile.contentPackage.',

    // Key to indicate in localStorage once app has been initialized
    isAppInitializedKey: 'cq.mobile.appInitialized',

    // Key to indicate where app has been deployed
    pgeDeployPathKey: 'pge.deployPath',

    // Key to indicate a custom server URL
    pgeServerURL: 'pge.serverURL',

    // Key to indicate file transfer options
    pgeTransferOptionsKey: 'pge.transferOptions',
    
    // Key to indicate the run mode
    pgeRunModeKey: 'pge.runMode',

    /**
     * Test if the application has already been initialized.
     */
    isAppInitialized: function() {
        return (this.isAppRunningInSandbox() && this.isPackageDataStored());
    },

    isAppRunningInSandbox: function() {
        var runMode = localStorage.getItem(this.pgeRunModeKey);
        if (runMode === "pge") {
            return true;
        }
        var currentLocation = window.location.href,
            pattern = /\/(Library|files)\/files\/.*www\//;
        //test currentLocation against known cordova.file.applicationStorageDirectory
        //locations on iOS and Android (unable to access File plugin since deviceready has yet to fire)
        return pattern.test(currentLocation);
    },

    /**
     * Test if the app's package data has been stored in localStorage.
     */
    isPackageDataStored: function() {
        return (localStorage.getItem(this.isAppInitializedKey) !== null);
    },

    /**
     * Get the path to the www/ directory.
     * @param {string} currentLocation - current document location
     */
    getPathToWWWDir: function(currentLocation) {
        // check for a deployPath from PGE
        var deployPath = this.getDeployPath(),
            indexOfWWW = currentLocation.indexOf(deployPath + '/www/');
        if (indexOfWWW !== -1) {
            return currentLocation.substring(0, indexOfWWW + (deployPath.length + 5));
        }
        return null;
    },

    /**
     * Get the subset of the path following the www/ directory.
     * @param {string} currentLocation - current document location
     */
    getPathToContent: function(currentLocation) {
        var pathToContent = null,
            deployPath = this.getDeployPath(),
            indexOfWWW = currentLocation.indexOf(deployPath + '/www/');
        if (indexOfWWW !== -1) {
            pathToContent = currentLocation.substring(indexOfWWW + deployPath.length + 5);
        }
        return pathToContent;
    },

    getDeployPath: function() {
        var deployPath = localStorage.getItem(this.pgeDeployPathKey);
        if (deployPath !== null && deployPath.length > 0) {
            return deployPath;
        }
        return "";
    },

    getServerURL: function() {
        var serverURL = localStorage.getItem(this.pgeServerURL);
        if (serverURL !== null && serverURL.length > 0) {
            return serverURL;
        }
        return undefined;
    },

    /**
     * Request filesystem access.
     * @param {function} callback - called with two parameters: (error, result)
     */
    requestFileSystemRoot: function(callback) {

        var requestFileSystemSuccess = function(fileSystem) {
            return callback(null, fileSystem.root);
        };

        // Failed to access the filesystem
        var requestFileSystemError = function(error) {
            var errorMessage = this.getFileRelatedErrorMessage(error);
            return callback(errorMessage);
        };

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            requestFileSystemSuccess, requestFileSystemError);
    },

    /**
     * Format a string message from a FileError.
     * @param {FileError} fileError - object containing error details
     */
    getFileRelatedErrorMessage: function(fileError) {
        // Handle error messages passed as strings
        if (!fileError || typeof fileError === 'string' || fileError instanceof String) {
            return 'File error. Message: [' + fileError + ']';
        }

        // Otherwise, extract file related error properties
        var errorCode = fileError.code || 'NO_CODE';
        var errorSource = fileError.source || 'NO_SOURCE';
        var errorTarget = fileError.target || 'NO_TARGET';
        var errorHttpStatus = fileError.http_status || 'NO_HTTP_STATUS';

        return 'File error. Code: [' + errorCode + '] source: [' + errorSource +
               '] target: [' + errorTarget + '] http_status: [' + errorHttpStatus + ']';
    },

    /**
     * Fetch JSON async via an XMLHttpRequest. Inspired by:
     * http://youmightnotneedjquery.com/#json
     * @param {string} url - URL to fetch JSON from
     * @param {function} callback - called with two parameters: (error, result)
     * @param {object} requestHeaders - optional object that contains HTTP
     *      request headers to be sent with the request
     */
    getJSON: function(url, callback, requestHeaders) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);

        // Set request headers if they have been provided
        if (requestHeaders !== null &&
            typeof requestHeaders === "object") {
            for (var property in requestHeaders) {
                if (requestHeaders.hasOwnProperty(property)) {
                    request.setRequestHeader(property, requestHeaders[property]);
                }
            }
        }

        request.onload = function() {
            if ((request.status >= 200 && request.status < 400) || request.status === 0){
                // Success
                var data;
                try {
                    data = JSON.parse(request.responseText);
                } catch (e) {
                    // error during json parsing
                    return callback('Parsing response from url: [' + url + '] failed: ' + e);
                }
                return callback(null, data);
            } else {
                // We reached our target server, but it returned an error
                return callback('Request to url: [' + url + '] returned status: [' + request.status + '].');
            }
        };

        request.onerror = function() {
            // There was a connection error of some sort
            return callback('Request to url: [' + url + '] resulted in a connection error.');
        };

        request.send();
    },

    /**
     * Get the filesystem path of a resource.
     * @param {string} url - URL of the resource
     * @param {function} callback - called with two parameters: (error, result)
     */
    getLocalFilesystemPath: function(url, callback) {
        callback(null, url);
    },

    /**
     * Store the details - such as timestamp - of a specific content package.
     * Will only overwrite the existing data if the contentPackageDetails.timestamp
     * value is > than the existing stored timestamp.
     * @param {string} name - content package name
     * @param {object} contentPackageDetails - details to store
     * @param {boolean} overwrite - if true, existing contentPackageDetails for
     *        `name` will be overwritten
     */
    storeContentPackageDetails: function(name, contentPackageDetails, overwrite) {
        var key = this.contentPackageDetailsKeyPrefix + name;

        // Do not overwrite existing data, unless the timestamp has increased or
        // the overwrite parameter is true
        var existingContentPackageDetails = this.getContentPackageDetailsByName(name);
        if (overwrite === true ||
                existingContentPackageDetails === null ||
                (contentPackageDetails.timestamp > existingContentPackageDetails.timestamp)) {
            // There is either no existing details String at this key, or
            // the existing timestamp is less than the new one
            localStorage.setItem(key, JSON.stringify(contentPackageDetails));
        }
    },

    /**
     * Returns the stored details of a specific content package.
     * @param {string} name - content package name
     */
    getContentPackageDetailsByName: function(name) {
        var key = this.contentPackageDetailsKeyPrefix + name;
        var details = localStorage.getItem(key);
        return JSON.parse(details);
    },

    /**
     * Removes the stored package information
     * @param {string} name - content package name
     */
    removeContentPackageDetails: function(name) {
        localStorage.removeItem(this.contentPackageDetailsKeyPrefix + name);
    },

    /**
     * Reads the specified request headers with the ones defined in the local storage. If a header is
     * present in both locations, the one in the local storage takes precedence.
     * @param {object} [specRequestHeaders] Optional object of request headers
     * @returns {object} The merged request headers
     */
    mergeRequestHeaders: function( specRequestHeaders ) {
        // copy the headers so we don't mess with the user's object
        var ret = {};
        if (typeof specRequestHeaders === 'object') {
            for (var name in specRequestHeaders) {
                if (specRequestHeaders.hasOwnProperty(name)) {
                    ret[name] = specRequestHeaders[name];
                }
            }
        }

        // If both are defined, use PGE headers over those supplied via the config spec
        var pgeHeadersString = localStorage.getItem(this.pgeTransferOptionsKey);
        var pgeHeaders = (pgeHeadersString !== null ? JSON.parse(pgeHeadersString) : {});

        for (var propertyName in pgeHeaders) {
            if (pgeHeaders.hasOwnProperty(propertyName)) {
                ret[propertyName] = pgeHeaders[propertyName];
            }
        }

        return ret;
    }
};