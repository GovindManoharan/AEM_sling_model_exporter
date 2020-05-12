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

/**
 * Usage:
 *
 * var user = new CQ.mobile.User();
 *
 */
(function() {
	'use strict';
	var currentUser;

	function User() {
		this.clear();
	}

	User.getCurrentUser = function() {
		return currentUser;
	};

	User.setCurrentUser = function( newUser ) {
		currentUser = newUser;
		return User.getCurrentUser();
	};

	User.prototype.getUsername = function() {
		return this.username;
	};

	User.prototype.setUsername = function( value ) {
		this.username = value;
	};

	User.prototype.getPassword = function() {
		return this.password;
	};

	User.prototype.setPassword = function( value ) {
		this.password = value;
	};

	User.prototype.getBasicAuth = function() {
		return "Basic " + Base64.encode( this.getUsername() + ':' + this.getPassword() );
	};

	User.prototype.save = function() {
		User.setCurrentUser(this);
		localStorage.setItem( "CQ.mobile.user.username", this.username || "" );
		localStorage.setItem( "CQ.mobile.user.password", this.password || "" );
	};

	User.prototype.restore = function() {
		this.username = localStorage.getItem( "CQ.mobile.user.username" ) || "";
		this.password = localStorage.getItem( "CQ.mobile.user.password" ) || "";
	};

	User.prototype.forget = function() {
		this.clear();
		localStorage.removeItem( "CQ.mobile.user.username" );
		localStorage.removeItem( "CQ.mobile.user.password" );
	};

	User.prototype.clear = function() {
		this.username = "";
		this.password = "";
	};

	function Base64() {
	}

	Base64.keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

	Base64.encode = function( input ) {
		var output = "";
		var chr1, chr2, chr3 = "";
		var enc1, enc2, enc3, enc4 = "";
		var i = 0;

		do {
			chr1 = input.charCodeAt( i++ );
			chr2 = input.charCodeAt( i++ );
			chr3 = input.charCodeAt( i++ );

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if( isNaN( chr2 ) ) {
				enc3 = enc4 = 64;
			} else if( isNaN( chr3 ) ) {
				enc4 = 64;
			}

			output = output +
			Base64.keyStr.charAt( enc1 ) +
			Base64.keyStr.charAt( enc2 ) +
			Base64.keyStr.charAt( enc3 ) +
			Base64.keyStr.charAt( enc4 );
			chr1 = chr2 = chr3 = "";
			enc1 = enc2 = enc3 = enc4 = "";
		} while( i < input.length );

		return output;
	};

	Base64.decode = function( input ) {
		var output = "";
		var chr1, chr2, chr3 = "";
		var enc1, enc2, enc3, enc4 = "";
		var i = 0;

		// remove all characters that are not A-Z, a-z, 0-9, +, /, or =
		var base64test = /[^A-Za-z0-9\+\/\=]/g;
		if( base64test.exec( input ) ) {
			alert( "There were invalid base64 characters in the input text.\n" +
			"Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
			"Expect errors in decoding." );
		}
		input = input.replace( /[^A-Za-z0-9\+\/\=]/g, "" );

		do {
			enc1 = Base64.keyStr.indexOf( input.charAt( i++ ) );
			enc2 = Base64.keyStr.indexOf( input.charAt( i++ ) );
			enc3 = Base64.keyStr.indexOf( input.charAt( i++ ) );
			enc4 = Base64.keyStr.indexOf( input.charAt( i++ ) );

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode( chr1 );

			if( enc3 != 64 ) {
				output = output + String.fromCharCode( chr2 );
			}
			if( enc4 != 64 ) {
				output = output + String.fromCharCode( chr3 );
			}

			chr1 = chr2 = chr3 = "";
			enc1 = enc2 = enc3 = enc4 = "";

		} while( i < input.length );

		return output;
	};

	// not for multi-user environments :)
	CQ.mobile.User = User;
})();