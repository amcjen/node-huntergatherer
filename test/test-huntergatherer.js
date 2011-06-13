(typeof define !== 'function' ? function($){ $(require, exports, module); } : define)(function(require, exports, module, undefined) {

exports['test callbacks'] = function(assert, done) {

	// fire up a test server to test against
	var http = require('http');
	var server = http.createServer(function(request, response) {
		var body = [];
		var url = require('url').parse(request.url, true);

		var offset = parseInt(url.query.offset);
		var limit = parseInt(url.query.limit);

		for (var i = offset; i < offset + limit; i++) {
			body.push(i);
		}
		var data = {
			count: Object.keys(body).length,
			results: body
		}


		response.statusCode = 200;
		response.setHeader('Content-Type', 'application/json');
		response.write(JSON.stringify(data));
		response.end();
	});
	server.listen(9876);


	var hg = require('../lib/huntergatherer');
	var options = {
		url: 'http://localhost:9876/?limit=10&offset=0',
		limitKey: 'limit',
		offsetKey: 'offset',
		limit: 10,
		startOffset: 0
	};

	var callbackCount = 0;
	hg.gather(options,
			function(error, response, data) {
				assert.equal(error, null, 'Error when getting count from remote server');

				var data = JSON.parse(data);
				return 100;
			},
			function(error, response, data) {
				assert.equal(error, null, 'Error when processing data from remote server');

				var data = JSON.parse(data);
				assert.equal(data.results.length, 10, 'Correct numbers of results');
				callbackCount += 1;
				if (callbackCount == 11) {
					done();
					server.close();
				}
			}
	);
};

if (module == require.main)
  require('test').run(exports);

});
