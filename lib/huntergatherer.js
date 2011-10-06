var url = require('url'),
    request = require('request'),
    async = require('async'),
    querystring = require('querystring'),
    Extendable = require("extendables").Extendable;

var defaultOptions = {
    headers: {
        Connection: 'keep-alive'
    },
    url: '',
    limitKey: 'limit',
    offsetKey: 'offset',
    offsetCallback: function(limit, count) {
        return limit;
    },
    limit: 10,
    offset: 0,
    maxToFetch: undefined,
    maxConnsPerSecond: undefined,
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

exports.gather = function(userOptions, countCallback, dataCallback, completedCallback) {
    var mergedOptions = Extendable.extend(defaultOptions);
    mergedOptions = mergedOptions.extend(userOptions);
    var options = new mergedOptions();

    var error;

    var apiRequest;
    if (options.oauth.enabled === true) {
        apiRequest = makeOAuthRequest;
    } else {
        apiRequest = makeRequest;
    }

    var queryString = url.parse(options.url, true);
    delete queryString.search;
    queryString.query[options.offsetKey] = options.offset;
    queryString.query[options.limitKey] = options.limit;
    options.url = url.format(queryString);
    
    apiRequest(options, options.url, function(err, res, body) {
        if (err || res.statusCode >= 400) {
            countCallback(err);
        }

        var count = countCallback(err, res, body);

        // if our maximum fetch request is set, and is higher than the total count available from the API,
        // set it to the total count instead.
        if (options.maxToFetch !== undefined) {
            if (options.offset + options.maxToFetch < count) {
                count = options.offset + options.maxToFetch;
            }
        }

        // now parallelize the hell out of the rest
        var uri = url.parse(options.url, true);
        var incrementBy;
        
        if (options.limit === undefined) {
            incrementBy = parseInt(options.offsetCallback(uri.query[options.limitKey]), 10);
        } else {
            incrementBy = options.limit;
        }
        var iterations = 0;
        var i = options.offset;
        var ranRequestOnce = false;
        
        if (count === 0) {
            dataCallback(err, res, JSON.stringify({results:[], count:0}), function() {
                return completedCallback(err, 0);
            });
        } else {
            async.whilst(function() {
                return i < count;
            },
            function(whilstCb) {
                //var url = 'http://sandbox.openapi.etsy.com/v2/listings/active?limit=100&offset=0';
                //console.log('calling url for data: ' + options.url);
                if (options.maxConnsPerSecond !== undefined && options.maxConnsPerSecond > 0) {
                    timeout = (1000 / options.maxConnsPerSecond);
                } else {
                    timeout = 0;
                }
                setTimeout(function() {
                    apiRequest(options, options.url, function(err, res, body) {
                        i += incrementBy;
                        iterations++;

                        queryString.query[options.offsetKey] = i;
                        options.url = url.format(queryString);
                    
                        dataCallback(err, res, body, function(cbErr) {
                            whilstCb(err || cbErr);
                        });    
                    });
                }, timeout); 
            },
            function(err) {
               return completedCallback(err, iterations);
            });
        }
    });
};

function makeRequest(options, url, dataCallback) {
    request(options, function(err, res, body) {
        if (err || res.statusCode >= 400) {
            console.log('Request failed for URL: ' + url + '(' + err + ')');
            return dataCallback(err);
        }
        return dataCallback(err, res, body);
    });
}

function makeOAuthRequest(options, url, dataCallback) {
    oa = setupOAuthClient(options.oauth);
    oa.getProtectedResource(options.url, 'GET', options.oauth.userToken, options.oauth.userSecret, function(err, body, res) {
        if (err || res.statusCode >= 400) {
            console.error('Request failed for URL: ' + url + ': ' + err.data);
            return dataCallback(err);
        }
        return dataCallback(err, res, body);
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