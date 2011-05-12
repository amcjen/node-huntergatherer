(typeof define !== 'function' ? function($){ $(require, exports, module); } : define)(function(require, exports, module, undefined) {

exports['test callbacks'] = function(assert) {
	
	// fire up a test server to test against
	var http = require('http');
	http.createServer(function(request, response) {
		var body = {};
		var url = require('url').parse(request.url, true);
		
		for (var i = url.query.offset; i <= url.query.offset + url.query.limit; i++) {
			body[i] = i+100;
		}
		
		var data = {
			count: Object.keys(body).length,
			results: body
		}
		
		response.sendHeader(200, {'Content-Type': 'application/json'});  
		response.write(JSON.stringify(data));  
		response.close();  
	}).listen(9876);
	
	
  var hg = require('../lib/huntergatherer');
	var options = {
		url: 'http://localhost:9876',
		limitKey: 'limit',
		offsetKey: 'offset',
		limit: 10
	};

	hg.gather(options, 
			function(error, response, data) {
				assert.equal(error, null, 'Error when getting count from remote server');
				
				var data = JSON.parse(data);
				return data.count;
			},
			function(error, response, data) {
				assert.equal(error, null, 'Error when processing data from remote server');
				
				var data = JSON.parse(data);
				assert.equal(data.results.length, 10);
			}
	);
};

if (module == require.main)
  require('test').run(exports);

});