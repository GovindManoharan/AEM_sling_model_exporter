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
(function(angular, document, undefined) {
	'use strict';

	/**
	 * angular-phonegap-ready v0.0.1
	 * (c) 2013 Brian Ford http://briantford.com
	 * License: MIT
	 */
	angular.module( 'btford.phonegap.ready', [] )
		.factory( 'phonegapReady', ['$window', function( $window ) {
		return function( fn ) {
			var queue = [];

			var impl = function() {
				queue.push( Array.prototype.slice.call( arguments ) );
			};

			function onDeviceReady() {
				queue.forEach( function( args ) {
					fn.apply( this, args );
				} );
				impl = fn;
			}

			if( $window.cordova ) {
				document.addEventListener( 'deviceready', onDeviceReady, false );
			} else {
				onDeviceReady();
			}

			return function() {
				return impl.apply( this, arguments );
			};
		};
	}] );

	/**
	 * https://github.com/jsanchezpando/angular-phonegap
	 * License: MIT
	 */
	var deferred_ready = null;
	angular.module( 'irisnet.phonegap', [] )
		.factory( 'deviceready', ['$rootScope', '$q',
			function( $rootScope, $q ) {

				if( !deferred_ready ) {
					deferred_ready = $q.defer();
					angular.element( document ).bind( 'deviceready', function() {
						var device = navigator.device || {};
						device.desktop = typeof window.cordova === 'undefined';
						device.ios = !device.desktop && device.platform === 'iOS';
						device.android = !device.desktop && device.platform === 'Android';

						deferred_ready.resolve( device );
					} );
				}

				return function() {
					return deferred_ready.promise;
				};
			}]
		);

})(angular, document);