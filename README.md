OVERVIEW
=========
HunterGatherer is a simple library.	 Its core purpose is to maximize the download speed and minimize the complexity of repetitive REST API calls.	 Node is a perfect platform for this, as it can easily parallelize calls and process the results via callbacks, as they return.

It's ideally suited to the types of calls you see via APIs.	 Here's one example from the Etsy API (http://developer.etsy.com/docs) that you need to make if you want to gather all of a users' active listings:

	http://openapi.etsy.com/v2/listings/active?limit=50&offset=0
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=50
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=100
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=150
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=200
	http://openapi.etsy.com/v2/listings/active?limit=50&offset=250

Traditionally, you'd loop through each call, process the results of that call, and then call the next offset, process, ad nauseum.

Not only is this super inefficient, it's slow and a pain in the ass to re-code all the time.	Especially when this pattern occurs in many APIs, and all that changes between them for the most part are the URL and how you process the results.	So let's abstract out everything else!

And lastly, with HunterGatherer each of these calls happen simultaneously, up to the maximum number of simultaneous connections allowed based on the remote API terms of usage.	 Non-blocking FTW!


HOW IT WORKS:
============
Simple, pass four arguments to the gather function:
	
	var hg = require('huntergatherer');
	hg.gather(options, countCallback, dataCallback, completedCallback);


Options
-------------------------------
Here are the options you can pass, along with defaults.	 The only required option is 'url'.

	{
		url: '',
		method: 'GET',
		headers: {},
		body: '',
		limitKey: 'limit',
		offsetKey: 'offset',
		limit: 10,
		offset: 0,
		maxToFetch: undefined,
		throttleMs: 0,
	}

* url:	The full URL of the remote REST endpoint.	 Include query variables here if necessary
* method: The REST method.	Defaults to 'GET'
* headers: Need to pass any additional headers with the request?	Do it here
* body: Sometimes needed if you're using POST or PUT as your method
* limitKey: The remote REST endpoint URL will have a variable name it uses for limit.	 Defaults to 'limit'
* offsetKey: The remote REST endpoint URL will also have a variable name it uses for offset.	Defaults to 'offset'
* limit: If you want to grab more than the default 10 results per request, set the limit here
* offset: If you don't want to retrieve everything by starting with offset 0, set this to the starting offset you want to start from
* maxToFetch: Set this to the total number of records you wish to fetch, regardless of the number of records available on the remote endpoint.	Good for testing when you don't want to fetch 100,000 records from the endpoint, even if they have 100,000 available.
* throttleMs: Some API endpoints have a max-requests-per-second limit.	This allows you to set a throttle between subsequent requests.	For instance, if your API endpoint has a setting of 10 max-requests-per-second, set this to something like 120, and HunterGatherer will put a 120ms timeout between each request, just a bit over the 10 per second rule, to be safe.

countCallback
-------------------------------
countCallback takes three arguments:

	countCallback(err, response, body);
	
* err: Set to the error if an error occurs
* response: The response of the remote request
* body: The body returned from the remote request

countCallback needs to return the *total number of items in the result*.	This is the total number of records available via pagination, not just the amount delivered in the specific request.

For instance, if a response comes back and there are 10,000 items in the result set, but because of limit/offset, only 100 are returned, countCallback needs to return the value 10000.	 Most APIs return a count property in every result.

dataCallback
-------------------------------
dataCallback takes four arguments, three of which are the same as before:

	dataCallback(err, response, body, dataCb);
	
* err: Set to the error if an error occurs
* response: The response of the remote request
* body: The body returned from the remote request
* dataCb: The function to call when done processing this resultset

dataCallback can do whatever it wants with the body of the result. This is the app-specific functionality you code up with the results as they stream in.	 The entire body will be available to you.	Just be sure to call dataCb(); when you are done processing your data, to let HunterGatherer know you're done with that chunk of data.

completedCallback
-------------------------------
completedCallback takes two arguments:

	completedCallback(err, iterations);
	
* err: Set to the error if an error occurs
* iterations: The number of total HTTP requests (iterations) that HunterGatherer made

This callback does not get called until all HTTP requests have completed, and all dataCallbacks have called their own dataCb() callbacks.	 This ensures that you can handle any post-processing of the request, after all requests have completed.



EXAMPLE:
================
Let's use Etsy again as an example.	 Their API is called like such:

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
			function(error, response, data, dataCb) {
				if (error) {
					console.log(error);
				}
				
				var data = JSON.parse(data);
				// do something awesome with data.results;
				dataCb();
				console.log(data.results);
			},
			function(error, iterations) {
				console.log('HunterGatherer completed. Called remote server ' + iterations + ' times');
			}
	);


INSTALLATION:
=============
npm install huntergatherer

REQUIREMENTS:
=============
Here are the npm requirements for huntergatherer

	"oauth" : ">=0.9.0",
	"extendables" : ">=0.1.2",
	"request" : ">=1.9.5",
	"async" : ">=0.1.9"