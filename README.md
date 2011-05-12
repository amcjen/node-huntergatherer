OVERVIEW
=========
Huntergatherer is a simple library.  Its core purpose is to maximize the download speed and minimize the complexity of repetitive REST API calls.  Node is a perfect platform for this, as it can easily parallelize calls and process the results via callbacks, as they return.

It's ideally suited to the types of calls you see via APIs.  Here's one example from the Etsy API (http://developer.etsy.com/docs) that you need to make if you want to gather all of a users' active listings:

	http://openapi.etsy.com/v2/listings/active?limit=50&offset=0
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=50
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=100
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=150
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=200
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=250

Traditionally, you'd loop through each call, process the results of that call, and then call the next offset, process, ad nauseum.

Not only is this super inefficient, it's slow and a pain in the ass to re-code all the time.  Especially when this pattern occurs in many APIs, and all that changes between them for the most part are the URL and how you process the results.  So let's abstract out everything else!

And lastly, with huntergatherer each of these calls happen simultaneously, up to the maximum number of simultaneous connections allowed based on the remote API terms of usage.  Non-blocking FTW!


HOW IT WORKS:
============
Simple, pass three arguments to the gather function:
	
	var hg = require('huntergatherer');
	hg.gather(options, countCallback, dataCallback);


Options
-------------------------------
Here are the options you can pass, along with defaults.  The only required option is 'url'.

	{
		url: '',
		method: 'GET',
		headers: {},
		body: '',
		limitKey: 'limit',
		offsetKey: 'offset',
		startOffset: 0,
		pool: {
			maxSockets: 10
		}
	}

* url:  The full URL of the remote REST endpoint.  Include query variables here if necessary
* method: The REST method.  Defaults to 'GET'
* headers: Need to pass any additional headers with the request?  Do it here
* body: Sometimes needed if you're using POST or PUT as your method
* limitKey: The remote REST endpoint URL will have a variable name it uses for limit.  Defaults to 'limit'
* offsetKey: The remote REST endpoint URL will also have a variable name it uses for offset.  Defaults to 'offset'
* startOffset: If you don't want to retrieve everything, starting with offset 0, set this to the starting offset you want to start from
* pool: This is a hash of remote agents that the 'request' module uses to pool connections.  
* pool.maxSockets: If you want to allow more or less simultaneous open sockets, change this.  Defaults to 10

countCallback
-------------------------------
countCallback takes three arguments:

	countCallback(error, response, body);
	
* error: Set to the error if an error occurs
* response: The response of the remote request
* body: The body returned from the remote request

countCallback needs to return the *total number of items in the result*.  This is the total number of records available via pagination, not just the amount delivered in the specific request.

For instance, if a response comes back and there are 10,000 items in the result set, but because of limit/offset, only 100 are returned, countCallback needs to return the value 10000.  Most APIs return a count property in every result.

dataCallback
-------------------------------
dataCallback also takes the same three arguments:

	dataCallback(error, response, body);
	
* error: Set to the error if an error occurs
* response: The response of the remote request
* body: The body returned from the remote request

dataCallback can do whatever it wants with the body of the result. This is the app-specific functionality you code up with the results as they stream in.  The entire body will be available to you.


EXAMPLE:
================
Let's use Etsy again as an example.  Their API is called like such:

	http://openapi.etsy.com/v2/listings/active?limit=50&offset=0
	
And they would return a JSON string looking something like this:
	
	{
	     "count":integer,
	     "results": [
	         { result object }
	     ],
	     "params": { parameters },
	     "type":result type
	}

We would call it like this:

	var hg = require('huntergatherer');

	var options = {
		url: 'http://openapi.etsy.com/v2/listings/active?limit=50&offset=0'
	};

	hg.gather(options, 
			function(error, response, data) {
				if (error) {
					console.log(error);
				}
				var data = JSON.parse(data);
				return data.count;
			},
			function(error, response, data) {
				if (error) {
					console.log(error);
				}
				
				var data = JSON.parse(data);
				// do something awesome with data.results;
				console.log(data.results);
			}


REQUIREMENTS:
=============
Here are the npm requirements for huntergatherer

	"oauth" : ">=0.9.0",
	"extendables" : ">=0.1.2",
	"request" : ">=1.9.5"