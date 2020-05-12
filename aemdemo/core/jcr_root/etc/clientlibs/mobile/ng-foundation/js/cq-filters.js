/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2013 Adobe Systems Incorporated
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
;(function (angular, undefined) {

    "use strict";

    /* Filters */
    angular.module('cqFilters', []).

        filter('omit', function() {
            return function(input, count) {
                if (!angular.isArray(input)) return input;

                count = parseInt(count);

                var out = [],
                    i, n;

                // if abs(limit) exceeds maximum length, trim it
                if (count > input.length)
                    count = input.length;
                else if (count < -input.length)
                    count = -input.length;

                if (count > 0) {
                    i = count;
                    n = input.length;
                } else {
                    i = 0
                    n = input.length + count;
                }

                for (; i<n; i++) {
                    out.push(input[i]);
                }

                return out;
            }
        });

}(angular));


