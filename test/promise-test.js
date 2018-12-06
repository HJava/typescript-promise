var promisesAplusTests = require("promises-aplus-tests");
var Promise = require('../lib/promise.js').default;

var adapter = {};

adapter.deferred = () => {
    let promise = new Promise();
    return {
        promise,
        resolve: promise.resolve.bind(promise),
        reject: promise.reject.bind(promise)
    }
}


promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
    if(error) {
        console.log(err);
    }
});