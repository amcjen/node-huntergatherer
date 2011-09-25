var path = require('path'),
fs = require('fs'),
url = require('url'),
http = require('http'),
Extendable = require("extendables").Extendable,
hg = require('../lib/huntergatherer');

var data;
var server = http.createServer(function(request, res) {
    var body = [];
    var url = require('url').parse(request.url, true);

    var offset = parseInt(url.query.offset, 10);
    var limit = parseInt(url.query.limit, 10);
   
    for (var i=offset; i<offset+limit; i++) {
        body.push({index:i});
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

var server2 = http.createServer(function(request, res) {
    var url = require('url').parse(request.url, true);

    var offset = parseInt(url.query.offset, 10);
    var limit = parseInt(url.query.limit, 10);

    var data = {
        count: 0,
        results: []
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(data));
    res.end();
});
server2.listen(9877);


function getDefaultOptions() {
    return  {
        url: 'http://localhost:9876/?limit=10&offset=0',
        limitKey: 'limit',
        offsetKey: 'offset',
        limit: 10,
        startOffset: 0,
    };
}

exports['Local Server'] = {
    'Full paging': function(test) {
        test.expect(23);

        var options = getDefaultOptions();

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 10, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Full paging with really slow data callbacks': function(test) {
        test.expect(23);

        var options = getDefaultOptions();   

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                setTimeout(function () {
                    test.equal(data.results.length, 10, 'Received the correct number of results');
                    dataCb();
                }, 80);
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 10, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Paging from offset': function(test) {
        test.expect(13);

        var options = getDefaultOptions();   
        options.startOffset = 50;

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 5, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Paging with maxToFetch set': function(test) {
        test.expect(7);

        var options = getDefaultOptions();   
        options.startOffset = 0;
        options.maxToFetch = 20;

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 2, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Paging from offset and maxToFetch set':  function(test) {
        test.expect(10);

        var options = getDefaultOptions();   
        options.startOffset = 50;
        options.maxToFetch = 30;
        var totalElements = [];

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                totalElements = totalElements.concat(data.results);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 3, 'iterated the proper number of times');
                test.equal(totalElements.length, 30, 'gathered all thirty items');
                test.done();
            }
        );
    },
    'Paging with larger limit':  function(test) {
        test.expect(11);

        var options = getDefaultOptions();   
        options.startOffset = 0;
        options.limit = 25;

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 25, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 4, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Paging with incomplete URL query params':  function(test) {
        test.expect(23);

        var options = getDefaultOptions();
        options.startOffset = 0;
        options.limit = 10;
        options.url = 'http://localhost:9876';

        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 10, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 10, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Result with 0 entries':  function(test) {
        test.expect(5);

        var options = getDefaultOptions();
        options.startOffset = 0;
        options.maxToFetch = 20;
        options.url = 'http://localhost:9877?zeroed=true';
        
        hg.gather(options,
            function(err, res, data) {
                test.equal(err, undefined, 'Successfully retrieved count from remote server');
                data = JSON.parse(data);
                return data.count;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 0, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 0, 'iterated the proper number of times');
                test.done();
            }
        );
    },
    'Close local server': function(test) {
        server.close();
        server2.close();
        test.done();
    }
};

exports['test Etsy OAuth requests'] = {
    'Etsy basic test': function(test) {
        var callbackCount = 0;
        test.expect(9);

        var etsyTokens = JSON.parse(fs.readFileSync('./etsytokens.json'));

        var options = getDefaultOptions();
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
                    if (!err) {
                        data = JSON.parse(data);
                        return data.count;
                    }
                    return undefined;
            },
            function(err, res, data, dataCb) {
                test.equal(err, undefined, 'Successfully processing data from remote server');
                data = JSON.parse(data);
                test.equal(data.results.length, 2, 'Received the correct number of results');
                dataCb();
            },
            function(err, iterations) {
                test.equal(err, undefined, 'Successfully processing completed callback from remote server');
                test.equal(iterations, 3, 'iterated the proper number of times');
                test.done();
            }
        );
    }
};