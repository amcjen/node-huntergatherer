var sys = require('sys');
var url = require('url');
var oauth = require('oauth');
var request = require('request');
var querystring = require('querystring');
var Extendable = require("extendables").Extendable;


var defaultOptions = {
	url: '',
	method: 'GET',
	headers: {},
	body: '',
	limitKey: 'limit',
	offsetKey: 'offset',
	offsetCallback: function(limit, count) {
		return limit;
	},
	startOffset: 0,
	pool: {
		maxSockets: 10
	}
};

exports.gather = function(userOptions, countCallback, dataCallback) {
	var mergedOptions = Extendable.extend(defaultOptions);
	mergedOptions = mergedOptions.extend(userOptions);
	
	var options = new mergedOptions();
	
	request(options, function(error, response, body) {
		if (error || response.statusCode >= 300) {
			console.log('Request failed for URL: ' + options.url + '(' + error + ')');
		}
		
		// process total count and initial request data
		var count = countCallback(error, response, body);
		var result = dataCallback(error, response, body);
		
		var uri = url.parse(options.url, true);
		
		// now parallelize the hell out of the rest
		var increment = parseInt(options.offsetCallback(uri.query[options.limitKey]));
		for (var i = parseInt(options.startOffset); i < count; i += increment) {
			//var url = 'http://openapi.etsy.com/v2/sandbox/private/listings/active?limit=100&offset='+i+'&keywords=owl&sort_on=created';
			
			var queryString = url.parse(options.url, true);
			delete queryString.search;

			queryString.query[options.offsetKey] = i;
			options.url = url.format(queryString);
			
			request(options, function(error, response, body) {
				if (error || response.statusCode >= 300) {
					console.log('Request failed for URL: ' + options.url + '(' + error + ')');
				}
				
				console.log('Calling dataCallback for URL: ' + options.url);
				return dataCallback(error, response, body);
			});
		}
		
		return result;
	});
};