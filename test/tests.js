var path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
    url = require('url'),
    http = require('http');

var data;
    
var server = http.createServer(function(request, res) {
	var body = [];
	var url = require('url').parse(request.url, true);

	var offset = parseInt(url.query.offset);
	var limit = parseInt(url.query.limit);

	for (var i=offset; i<offset+limit; i++) {
		body.push({index:'data-'+i});
	}
	var data = {
		count: 100,
		results: body
	};


	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/json');
	res.write(JSON.stringify(data));
	res.end();
});
server.listen(9876);
sys.puts("Server running at http://localhost:9876/");

var hg = require('../lib/huntergatherer');
var options = {
	url: 'http://localhost:9876/?limit=10&offset=0',
	limitKey: 'limit',
	offsetKey: 'offset',
	limit: 10,
	startOffset: 0,
};

exports['test full paging'] = function(test) {
    var callbackCount = 0;
    test.expect(21);

    hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                callbackCount++;
                if (callbackCount === 10) {
                    test.done();
                }
            }
    );
};

exports['test paging from offset'] = function(test) {
    var callbackCount = 0;
    test.expect(11);
    
    options.startOffset = 50;

	hg.gather(options,
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully retrieved count from remote server');
				data = JSON.parse(data);
				return data.count;
			},
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully processing data from remote server');
				data = JSON.parse(data);
				test.equal(data.results.length, 10, 'Received the correct number of results');
				callbackCount++;
				if (callbackCount === 5) {
					test.done();
				}
			}
	);
};

exports['test paging with maxToFetch set'] = function(test) {
    var callbackCount = 0;
    test.expect(5);
    
    options.startOffset = 0;
    options.maxToFetch = 20;

	hg.gather(options,
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully retrieved count from remote server');
				data = JSON.parse(data);
				return data.count;
			},
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully processing data from remote server');
				data = JSON.parse(data);
				test.equal(data.results.length, 10, 'Received the correct number of results');
				callbackCount++;
				if (callbackCount === 2) {
					test.done();
				}
			}
	);
};

exports['test paging from offset and maxToFetch set'] = function(test) {
    var callbackCount = 0;
    test.expect(5);
    
    options.startOffset = 50;

	hg.gather(options,
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully retrieved count from remote server');
				data = JSON.parse(data);
				return data.count;
			},
			function(err, res, data) {
				test.equal(err, undefined, 'Successfully processing data from remote server');
				data = JSON.parse(data);
				test.equal(data.results.length, 10, 'Received the correct number of results');
				callbackCount++;
				if (callbackCount === 2) {
					test.done();
					server.close();
				}
			}
	);
};

exports['test Etsy OAuth requests'] = function(test) {
    var callbackCount = 0;
    test.expect(7);
    
    var etsyTokens = JSON.parse(fs.readFileSync('./etsytokens.json'));

    options.startOffset = 0;
    options.limit = 2;
    options.maxToFetch = 6;
    options.url = 'http://sandbox.openapi.etsy.com/v2/listings/active?limit=2&offset=0';
    
    options.oauth = {
        enabled: true,
        authUrl: 'http://sandbox.openapi.etsy.com/v2/oauth/request_token', 
        verifyUrl: 'http://sandbox.openapi.etsy.com/v2/oauth/access_token',
        appKey: etsyTokens.appKey,
        appSecret: etsyTokens.appSecret,
        userToken: etsyTokens.userToken,
        userSecret: etsyTokens.userSecret,
        version: '1.0',
        redirectUrl: 'http://localhost:3000/etsy/verify',
        crypto: 'HMAC-SHA1'
    };
    
    hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 2, 'Received the correct number of results');
                callbackCount++;
                if (callbackCount === 3) {
                    test.done();
                }
            }
    );
};

