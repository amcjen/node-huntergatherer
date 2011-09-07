var sys = require('sys');
var url = require('url');
var request = require('request');
var querystring = require('querystring');
var Extendable = require("extendables").Extendable;

var defaultOptions = {
    url: '',
    limitKey: 'limit',
    offsetKey: 'offset',
    offsetCallback: function(limit, count) {
        return limit;
    },
    startOffset: 0,
    maxToFetch: undefined,
    pool: {
        maxSockets: 10
    },
    oauth: {
        enabled: false,
        authUrl: '', 
        verifyUrl: '',
        appKey: '',
        appSecret: '',
        userToken: '',
        userSecret: '',
        version: '1.0',
        redirectUrl: '',
        crypto: 'HMAC-SHA1'
    }
};

exports.gather = function(userOptions, countCallback, dataCallback) {
    var mergedOptions = Extendable.extend(defaultOptions);
    mergedOptions = mergedOptions.extend(userOptions);
    var options = new mergedOptions();
    
    var error;
    
    var apiRequest;
    if (options.oauth.enabled === true) {
        apiRequest = makeOAuthRequest;
    } else {
        apiRequest =makeRequest;
    }
    
    apiRequest(options, options.url, function(err, res, body) {
        if (err || res.statusCode >= 300) {
            return countCallback(error);
        }
        
        var count = countCallback(err, res, body);      
        
        verifyOptions(options, count, function(err) {
            if (err) {
                return dataCallback(err);
            }
        });
        
        // if our maximum fetch request is set, and is higher than the total count available from the API,
        // set it to the total count instead.
        if (options.maxToFetch !== undefined) {
            if (options.startOffset + options.maxToFetch < count) {
                count = options.startOffset + options.maxToFetch;
            }
        }
        
        // now parallelize the hell out of the rest
        var uri = url.parse(options.url, true);
        var increment = parseInt(options.offsetCallback(uri.query[options.limitKey]));
        
        for (var i=options.startOffset; i<count; i+=increment) {
            //var url = 'http://sandbox.openapi.etsy.com/v2/listings/active?limit=100&offset=0';
            
            var queryString = url.parse(options.url, true);
            delete queryString.search;

            queryString.query[options.offsetKey] = i;
            options.url = url.format(queryString);
            apiRequest(options, options.url, dataCallback);
        }       
        return;
    });
};

function verifyOptions(options, count, callback) {
    var error;
    if (options.startOffset > count) {
        error = 'Starting offset is higher than total count of records fetched';
        console.error(error);
        return callback(error);
    }
}

function makeRequest(options, url, dataCallback) {
    request(options, function(err, res, body) {
        if (err || res.statusCode >= 300) {
            console.log('Request failed for URL: ' + url + '(' + err + ')');
            return dataCallback(err);
        }
        dataCallback(err, res, body);
    });
}

function makeOAuthRequest(options, url, dataCallback) {
    oa = setupOAuthClient(options.oauth);
    oa.getProtectedResource(options.url, 'GET', options.oauth.userToken, options.oauth.userSecret, function(err, body, res) {
        if (err || res.statusCode >= 300) {
            console.error('Request failed for URL: ' + url + ': ' + err.data);
            return dataCallback(err);
        }
        dataCallback(err, res, body);
    });
}

function setupOAuthClient(oauth) {
    var OAuth = require('oauth').OAuth;
    return new OAuth(oauth.authUrl,
                     oauth.verifyUrl,
                     oauth.appKey,
                     oauth.appSecret,
                     oauth.version,
                     oauth.redirectUrl,
                     oauth.crypto);
}