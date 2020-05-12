/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2015 Adobe Systems Incorporated
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

window.CQ = window.CQ || {};
CQ.mobile = CQ.mobile || {};

CQ.mobile.push = function() {
    var conf = {};
    var onNotification;
    var deepLinkHandler;
    var pushImpl;

    /**
     * Initialize the client side Push Notification handling mechanism.
     * @param {object} spec - configuration object. Key properties include:
     *  `spec.notificationHandler` - function to call when a notification arrives. Defaults to `this.genericNotificationHandler`
     *  `spec.deepLinkHandler` - function to call to handle a notification containing a deep link. Defaults to `this.genericDeepLinkHandler`
     * @param {function} callback - kept around for backwards compatibility. Prefer `spec.notificationHandler`
     */
    var initialize = function(spec, callback) {
        spec = spec || {};

        // Set up notification handler
        if (typeof spec.notificationHandler === "function") {
            // Use the provided notification handler
            onNotification = spec.notificationHandler;
        }
        else if (typeof callback === "function") {
            // Use the callback function if defined (kept around for backwards compatibility)
            onNotification = callback;
        }
        else {
            // Fall back to the generic handler
            onNotification = genericNotificationHandler;
        }

        // Set up the deep link handler
        if (typeof spec.deepLinkHandler === "function") {
            // Use the provided deep link handler
            deepLinkHandler = spec.deepLinkHandler;
        }
        else {
            // Fall back to the generic handler
            deepLinkHandler = genericDeepLinkHandler;
        }

        var configFileName = spec.contentPackagesFileName || 'pge-notifications-config.json';
        var confFile = CQ.mobile.contentUtils.getPathToWWWDir(window.location.href) + configFileName;

        fileExists(confFile, function(exists) {
            if (exists) {
                CQ.mobile.contentUtils.getJSON(confFile, function (error, data) {
                    if (error) {
                        return console.warn("[mobilePush] getJSON error details: [" + error + "]");
                    }

                    console.log('[mobilePush] reading from ' + configFileName);
                    conf = data || {};
                    if (conf.gcmID) {
                        console.log("[mobilePush] gcm ID = " + conf.gcmID);
                    }
                    if (conf.appID) {
                        console.log("[mobilePush] app ID = " + conf.appID);
                    }

                    console.log("[mobilePush] service ID = " + conf.pushServiceId);
                    if (conf.pushServiceId) {
                        console.log("[mobilePush] registering for push notifications");
                        register();
                    }
                });
            }
            else {
                return console.warn("[mobilePush] " + confFile + " not found.  If Push Notifications are not being used in this app, " +
                    "consider removing the 'cq.mobile.push' embedded clientlibs from the app.");
            }
        });
    };

    var fileExists = function(filePath, callback) {
        window.resolveLocalFileSystemURL(filePath,
            function success() {
                callback(true);
            },
            function fail() {
                callback(false);
            }
        );
    };

    var authenticateAmazon = function(registrationID){
        // The parameters required to intialize the Cognito Credentials object.
        var params = {
            AccountId: conf.accountId,
            IdentityPoolId: conf.identityPool,
            RoleArn: conf.roleARN
        };
        // set the Amazon Cognito region
        AWS.config.region = conf.configRegion;
        // initialize the Credentials object with our parameters
        AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

        // We can set the get method of the Credentials object to retrieve
        // the unique identifier for the end user (identityId) once the provider
        // has refreshed itself
        AWS.config.credentials.get(function(err) {
            if (err){ // an error occurred
                console.log("[mobilePush] credentials.get: " + err, err.stack);
                console.log("[mobilePush] AWS.config.credentials: " + JSON.stringify(AWS.config.credentials));
            }
            else{
                console.log("[mobilePush] Cognito Identity Id: " + AWS.config.credentials.identityId);
                registerAmazon(registrationID, AWS.config.credentials.identityId);
            }
        });
    };

    var registerAmazon = function(registrationID, congnitoID){
        var cognitosync = new AWS.CognitoSync();
        cognitosync.listRecords({
            DatasetName: 'TEST_DATASET', // required
            IdentityId: congnitoID,  // required
            IdentityPoolId: conf.identityPool  // required
        }, function(err, data) {
            if (err){
                console.log("[mobilePush] listRecords: " + err, err.stack + "_____");
            }
            else {
                console.log("[mobilePush] listRecords: " + JSON.stringify(data) + "_____");
                console.log("[mobilePush] DatasetSyncCount: " + data.DatasetSyncCount + "_____");

                var sns = new AWS.SNS({
                    apiVersion: '2010-03-31',
                    sessionToken: data.SyncSessionToken
                });
                var params = {
                    Token: registrationID,
                    Attributes: {},
                    CustomUserData: ''
                };
                if (isAndroid()) {
                    params.PlatformApplicationArn = conf.androidPlatformAppARN;
                } else {
                    params.PlatformApplicationArn = conf.iosPlatformAppARN;
                }
                sns.createPlatformEndpoint(params, function(err, data) {
                    if (err) {
                        console.log("[mobilePush] create endpoint " + err, err.stack);
                    } else {
                        console.log("[mobilePush] create endpoint " + JSON.stringify(data));
                        var params = {
                            Protocol: 'application', /* required */
                            TopicArn: conf.topicARN, /* required */
                            Endpoint: data.EndpointArn
                        };
                        sns.subscribe(params, function(err, data) {
                            if (err) {
                                console.log("[mobilePush] subscribe topic " + err, err.stack);
                            }
                            else {
                                console.log("[mobilePush] subscribe topic " + JSON.stringify(data));
                            }
                        });
                    }
                });
            }
        });
    };

    var successHandler = function(result) {
        console.log('[mobilePush] Callback Success! Result = '+result)
    };

    var errorHandler = function(error) {
        console.log('[mobilePush] ' + error);
    };

    var onRegistration = function(event)  {
        console.log('[mobilePush] on registration');
        console.log(JSON.stringify(event));
        if (!event.error) {
            successHandler(event.pushID);
        } else {
            errorHandler(event.error)
        }
    };

    var register = function() {
        // PushWoosh
        if (conf.pushServiceId === "pushwoosh") {
            console.log('[mobilePush] Register with PushWoosh');
            //set push notifications handler
            document.addEventListener('push-notification', CQ.mobile.push.onNotificationPushWoosh);

            //initialize Pushwoosh with projectid: "GOOGLE_PROJECT_NUMBER", appid : "PUSHWOOSH_APP_ID". This will trigger all pending push notifications on start.
            window.plugins.pushNotification.onDeviceReady({ projectid: conf.gcmID, appid : conf.appID, pw_appid: conf.appID });

            //register for pushes
            window.plugins.pushNotification.registerDevice(successHandler, errorHandler);
        }
        // Urban Airship
        else if (conf.pushServiceId === "urbanairship") {
            console.log('[mobilePush] Register with UrbanAirship');
            // Register for any urban airship events
            document.addEventListener("urbanairship.registration", CQ.mobile.push.onRegistration, false);
            document.addEventListener("urbanairship.push", CQ.mobile.push.onNotificationUrbanAirship, false);

            // Handle resume
            document.addEventListener("resume", function() {
                console.log("[mobilePush] Device resume!");

                PushNotification.resetBadge();
                PushNotification.getIncoming(CQ.mobile.push.onNotificationUrbanAirship);
                // Reregister for urbanairship events if they were removed in pause event
                document.addEventListener("urbanairship.registration", CQ.mobile.push.onRegistration, false);
                document.addEventListener("urbanairship.push", CQ.mobile.push.onNotificationUrbanAirship, false);
            }, false);

            // Handle pause
            document.addEventListener("pause", function() {
                console.log("[mobilePush] Device pause!");

                // Remove urbanairship events.  Important on android to not receive push in the background.
                document.removeEventListener("urbanairship.registration", CQ.mobile.push.onRegistration, false);
                document.removeEventListener("urbanairship.push", CQ.mobile.push.onNotificationUrbanAirship, false);
            }, false);

            // Register for notification types
            PushNotification.registerForNotificationTypes(PushNotification.notificationType.badge |
                PushNotification.notificationType.sound |
                PushNotification.notificationType.alert);

            // Get any incoming push from device ready open
            PushNotification.getIncoming(CQ.mobile.push.onNotificationUrbanAirship);

            // Is it already registered
            PushNotification.getPushID(function(result) {
                console.log('[mobilePush] ua id = ' + result);
            });
        }
        // Amazon or AMS
        else {
            if (conf.pushServiceId === "amazonws") {
                console.log('[mobilePush] Register with PushPlugin');
            } else if (conf.pushServiceId === "ams") {
                console.log('[mobilePush] Register with AMS');
            }
            pushImpl = PushNotification.init({
                "android": {
                    "senderID": conf.gcmID,
                    "icon": "notification",
                    "iconColor": conf.iconColor  // This is the shade background color
                },
                "ios": {
                    "alert": "true",
                    "badge": "true",
                    "sound": "true"
                }
            });

            // Log any push plugin related errors to the console
            pushImpl.on('error', function(error) {
                console.error('[mobilePush] Error: ' + error.message);
            });

            pushImpl.on('registration', function(data) {
                console.log('[mobilePush] Device ID: ' + data.registrationId);
                if (conf.pushServiceId === "amazonws") {
                    authenticateAmazon(data.registrationId);
                    console.log('[mobilePush] Device ID registered with AWS');
                } else if (conf.pushServiceId === "ams") {
                    ADB.setDebugLogging(true);
                    ADB.setPushIdentifier(data.registrationId,
                        function() {console.log('[mobilePush] Device ID registered with AMS');},
                        function(error) {
                            console.log('[mobilePush] Device ID not registered with AMS');
                            console.log('[mobilePush] Error: ' + error.toString());
                        });
                }
            });

            pushImpl.on('notification', function(event) {
                console.log("[mobilePush] push received");
                onNotification({
                    message: event.message,
                    title: event.title || event.additionalData.title,
                    link: event.additionalData.link,
                    linkText: event.additionalData.linkText,
                    count: event.count,
                    sound: event.sound,
                    deliveryId: event.additionalData._dId,
                    broadlogId: event.additionalData._mId
                });

                if ( event.count ) {
                    CQ.mobile.push.pushImpl.setApplicationIconBadgeNumber(null, null, event.count);
                }
            });
        }
    };

    var isAndroid = function() {
        if ( device.platform === 'android' || device.platform === 'Android' || device.platform === "amazon-fireos" ) {
            return true;
        } else {
            return false;
        }
    };

    var onNotificationPushWoosh = function(event) {
        console.log("[mobilePush] onNotificationPushWoosh called");
        var msg = event.notification.aps || event.notification;
        onNotification({
            message: msg.title || msg.alert,
            title: msg.header || (msg.userdata && msg.userdata.title) || (event.notification.u && event.notification.u.title),
            link: (msg.userdata && msg.userdata.link) || (event.notification.u && event.notification.u.link),
            linkText: (msg.userdata && msg.userdata.linkText) || (event.notification.u && event.notification.u.linkText),
            count: msg.msgcnt || msg.badge || 0,
            sound: msg.s || msg.sound,
            additionalData: msg.userdata || event.notification.u
        });
    };

    var onNotificationUrbanAirship = function(event) {
        console.log("[mobilePush] onNotificationUrbanAirship called");
        console.log(event);
        onNotification({
            message: event.message,
            title: event.title,
            link: event.link,
            linkText: event.linkText,
            count: event.msgcnt,
            sound: event.sound,
            additionalData: event.extras
        });
    };

    /**
     * General push notification handler. Displays the message payload, plays a sound, and directs to
     * a particular state of the app (if applicable).
     * @param {object} data - notification payload
     * @param {function} notificationAcknowledgedCallback - optional callback fired when a notification has been acknowledged
     */
    var genericNotificationHandler = function(data, notificationAcknowledgedCallback) {
        var notificationAcknowledged = function() {
            console.log("[mobilePush] notification acknowledged");
            if (typeof notificationAcknowledgedCallback === "function") {
                notificationAcknowledgedCallback(data);
            }
        };

        console.log("[mobilePush] general notification handler called");
        console.log("[mobilePush] notification data: " + JSON.stringify(data));
        if (data.message) {
            var title = data.title || 'Alert';
            if (data.link && (typeof data.link !== 'function')) { // CQ-63201 Pushwoosh returns data.link as a function when should not.
                navigator.notification.confirm(data.message,
                    function (buttonIndex) {
                        notificationAcknowledged();
                        console.log("[mobilePush] Button index: " + buttonIndex);
                        console.log("[mobilePush] Deep link called: " + data.link);
                        if(buttonIndex == 2) {
                            // Handle deep link
                            deepLinkHandler(data.link)
                        }
                    },
                    title, ['Dismiss', data.linkText]);
            } else {
                navigator.notification.alert(data.message, notificationAcknowledged, title);
            }
        }
        if (data.sound && navigator.Media) {
            var notifSound = new Media(data.sound);
            notifSound.play();
        }
    };

    /**
     * General deep link handler. Sets the hash to the provided linkPath value.
     * @param {string} linkPath - path to direct the app user to
     */
    var genericDeepLinkHandler = function(linkPath) {
        // Set the agent's hash to the provided linkPath
        window.location.hash = linkPath;
    };

    // Exported functions
    var that = {
        initialize: initialize,
        onRegistration: onRegistration,
        onNotificationPushWoosh: onNotificationPushWoosh,
        onNotificationUrbanAirship: onNotificationUrbanAirship,
        genericNotificationHandler: genericNotificationHandler,
        genericDeepLinkHandler: genericDeepLinkHandler
    };

    return that;
}();
