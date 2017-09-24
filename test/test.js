const currency_conversion_job = require('../currency_conversion_job');
const database = require('./database');
const assert = require('assert');
const Promise = require('bluebird');

var test_cases =[
function(){
    return new Promise(function(resolve,reject){
        var expected_result = '64.80'
        var rate_request = {from: "USD", to: "INR", counter: 1};
        try{
            currency_conversion_job.findExchangeRate(rate_request).then(function(result){
                assert.deepStrictEqual(result[0], expected_result, "Expected to throw " + expected_result +" but given ", result[0]);
                resolve();
            });
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        var expected_result = 'err'
        var rate_request = {from: "", to: "", counter: 1};
        try{
        currency_conversion_job.findExchangeRate(rate_request).then(function(result){
            assert.deepStrictEqual(result[0], expected_result, "Expected to throw " + expected_result +" but given ", result[0]);
            resolve();
        });
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        var expected_result = 'err'
        var rate_request = {from: "USD", to: "", counter: 1};
        try{
        currency_conversion_job.findExchangeRate(rate_request).then(function(result){
            assert.deepStrictEqual(result[0], expected_result, "Expected to throw " + expected_result +" but given ", result[0]);
            resolve();
        });
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        var expected_result = 'err'
        var rate_request = {from: "", to: "INR", counter: 1};
        try{
            currency_conversion_job.findExchangeRate(rate_request).then(function(result){
                assert.deepStrictEqual(result[0], expected_result, "Expected to throw " + expected_result +" but given ", result[0]);
                resolve();
            });
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        //var expected_result = 'err'
        var rate_request = {from: "USD", to: "INR", counter: 1};
        try{
            currency_conversion_job.schedulingJob(rate_request).then(function(result){
                //assert.deepStrictEqual(result[0], expected_result, "Expected to throw " + expected_result +" but given ", result[0]);
                resolve();
            });
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        //var expected_result = 'err'
        var rate_request = {from: "USD", to: "INR", counter: 1};
        try{
            currency_conversion_job.processingQueueJob();
            resolve();
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        var job_id_to_kill = 3456
       // var rate_request = {from: "USD", to: "INR", counter: 1};
        try{
            currency_conversion_job.destroy(job_id_to_kill);
            resolve();
        }
        catch(err){
            reject(err);
        }
    });
},
function(){
    return new Promise(function(resolve,reject){
        var data_to_save = ['64.80',{ from :'USD',to:'INR',counter:1}];
        //var rate_request = {from: "USD", to: "INR", counter: 1};
        try{
            database.saveToMongo(data_to_save).then(function(status){
                resolve();
            },function(err){
                reject(err);
            });
        }
        catch(err){
            reject(err);
        }
    });
},

];
function test() {
    console.log('\nTesting Cases...');
    function runCase(i) {
        if (test_cases[i])
            console.log('executing case:' + i);
        return test_cases[i]().then(function (data) {
            console.log("Passed")
        }, function (err) {
            if ((typeof err) === 'object') {
                console.log("Failed!!!", err.message);
            }
            else {
                console.log("Failed!!!", err);
            }
        }).finally(function () {
            if (test_cases.length > i + 1)
                return (test_cases.length > i) ? runCase(i + 1) : undefined;
            else
                console.log("Congratulations!!! all cases are run successfully.");
        });
    }
    runCase(0).then(function (data) {});
}
test();