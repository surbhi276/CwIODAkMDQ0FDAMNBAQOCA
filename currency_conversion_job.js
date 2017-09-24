const Promise = require('bluebird');
const format = require('string-template');
const osmosis = require('osmosis');
const fivebeans = require('fivebeans');
const app_config = require('./app_config');
const database = require('./database');
const logger = require('./logs_module/logs_module.js');
var currency_converter_API = app_config.getConfig('currency_converter_API');
var currency_rate = app_config.getConfig('currency_rate');
var beanstalkd_host = app_config.getConfig('beanstalkd_server').host;
var beanstalkd_port = app_config.getConfig('beanstalkd_server').port;
var beanstalkd_tube = app_config.getConfig('beanstalkd_server').tube;
var beanstalkd_client = null;
var beanstalkd_connection_exist = false;

// connecting with beanstalkd server.
function beanstalkdConnection() {
    return new Promise(function (resolve, reject) {
        if (beanstalkd_connection_exist)
            resolve(beanstalkd_client);
        else {
            beanstalkd_client = new fivebeans.client(beanstalkd_host, beanstalkd_port);
            beanstalkd_client.on('connect', function () {
                logger.log('detailed','BeanStalkd server has been created',{beanstalkd_server : beanstalkd_host + ':'+ beanstalkd_port });
                beanstalkd_client.ignore('default', function (err, numwatched) {
                    beanstalkd_client.use(beanstalkd_tube, function (err, tubename) {
                        if (err) {
                            logger.log('error','Error occured while configuring Benastalkd Tube ',{error : err});
                            reject(err);
                        } else {
                            beanstalkd_connection_exist = true;
                            resolve(beanstalkd_client);
                        }
                    });
                });
            }).on('error', function (err) {
                    logger.log('error','Error occured while establishing Beanstalkd server',{error : err});
                    reject(err);
                }).on('close', function () {
                    logger.log('detailed','BeanStalkd server has been closed',{beanstalkd_server : beanstalkd_host + ':'+ beanstalkd_port });
                    beanstalkd_client = null;
                    beanstalkd_connection_exist = false;
                }).connect();
        }
    });
}
module.exports.beanstalkdConnection = beanstalkdConnection


/*function used to get the rates of currencies with 
inputs :- rate_request: (type :- object)
*/
function findExchangeRate(rate_request) {
   logger.log('detailed','Entering to findExchangeRate() function with ',{data : rate_request , time : new Date()});
    return new Promise(function (resolve, reject) {
        var cnt = 0;
        if(!rate_request.from || !rate_request.to){
            logger.log('error','From/To currency is/are missing');
            return resolve(['err',rate_request]);
        }
        extractCurrencyData();
        function extractCurrencyData() {
            osmosis.get(format(currency_converter_API, {
                from: rate_request.from,
                to: rate_request.to
            })).set({
                'data': currency_rate
            }).data(function (data) {
                if (data.data) data.data = Number(data.data).toFixed(app_config.getConfig('exchange_rate_fixed_decimal_value'));
                resolve([data.data, rate_request]);
            }).error(function (e) {
                cnt++;
                logger.log('error','Error occured while fetching data for Exchange Rate',{error : e ,time : new Date() });
                if(cnt > app_config.getConfig('exchange_rate_failed_retry_count') - 1)
                    resolve(['err',rate_request]);             
                else      
                     setTimeout(extractCurrencyData,app_config.getConfig('exchange_rate_failed_wait_duration'));
            });
        }
    });
}
module.exports.findExchangeRate = findExchangeRate;

/*function used to scheduling the job in beanstalkd server with
input : - rate_request: (type :- object),delay(optional) :(type :- number)
*/
function schedulingJob(rate_request, delay) {
    logger.log('detailed','Entering to schedulingJob() function with ',{data : rate_request , delay : delay , time : new Date()});
    return new Promise(function (resolve, reject) {
        beanstalkdConnection().then(function (client) {
            client.put(1, delay || 0, 100, JSON.stringify(rate_request), function (err, jobid) { 
                if (err) {
                    logger.log('error','Error occured while putting job in Beanstalkd server',{error : err });
                    reject(err);
                } else {
                    resolve(jobid);
                }
            });
        }, function (err) { 
            logger.log('error','Error occured connecting to Beanstalkd server',{error : err});
            reject(err);
        });
    });
}
module.exports.schedulingJob = schedulingJob;

/*function used to process the job in beanstalkd server as according to the requirements
*/
function processingQueueJob() {
    logger.log('detailed','Entering to processingQueueJob() function',{ time : new Date()});
    beanstalkdConnection().then(function (client) {
        client.peek_ready(function (err, jobid, payload) {
            if (!jobid || err) { 
                logger.log('error','Error in fetching job in ready state',{error : err , jobid : jobid , time : new Date()});
                processingQueueJob(); 
                return; 
            }

            var payload_obj = JSON.parse(payload);
            findExchangeRate(payload_obj).then(function (rates) {
                if(rates[0] == 'err'){
                    destroyJob(jobid);
                    processingQueueJob();
                    return;
                }
                database.saveToMongo(rates).then(function (status) {
                    logger.log('detailed','Data has been saved in Mongo database ',{data : rates});
                    destroyJob(jobid);
                    payload_obj.counter++;
                    if (payload_obj.counter <= app_config.getConfig('exchange_rate_successful_retry_count')) {
                        schedulingJob(payload_obj, app_config.getConfig('success_wait_duration')).then(function () {
                            processingQueueJob();
                        });
                    }
                    else
                        processingQueueJob();
                },function(err){
                    logger.log('error','Error while saving data to mongo database',{error : err});
                });
            });
        });
    });
}
module.exports.processingQueueJob = processingQueueJob;

/*function used to destroy the job in beanstalkd server with 
input jobid : (type :- number)
*/
function destroyJob(jobid) {
    logger.log('detailed','Entering to destroyJob() function',{ time : new Date()});
    beanstalkdConnection().then(function (client) {
        client.destroy(jobid, function (err) {
            if (err) {
                logger.log('error','Error while destroying the job ',{ error : err ,jobid : jobid , time : new Date()});
                setTimeout(destroyJob, 2000, jobid);
            }
        });
    });
}
module.exports.destroyJob = destroyJob;

/*function used to kill beanstalkd server
*/
function killQueueConnection() {
    logger.log('detailed','Entering to killQueueConnection() function',{ time : new Date()});
    beanstalkdConnection().then(function (client) {
        client.quit();
    });
}
module.exports.killQueueConnection = killQueueConnection;