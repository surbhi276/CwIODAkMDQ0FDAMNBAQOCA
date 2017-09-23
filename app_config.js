var config = {};
config['currency_converter_API'] = 'http://www.xe.com/currencyconverter/convert/?Amount=1&From={from}&To={to}#converter';
config['currency_rate'] = '.uccResultAmount';
config['mongo_server'] = {
	                        host: "localhost",
	                        port: "27017",
                            dbName: "EXCHANGEDB",
                            collectionName : "ExchangeRates"
                        };
config['beanstalkd_server'] = {
                            host : 'challenge.aftership.net',
                            port : '11300',
                            tube : 'SURBHI276'
                           };
config['success_wait_duration']= 60,
config['exchange_rate_successful_retry_count']= 10,
config['exchange_rate_failed_wait_duration']= 3000,
config['exchange_rate_failed_retry_count']= 3,
config['fixed_decimal_value'] = 2

config["Server_port"] = 9005;

config["no_of_processes"] = 1;
var getConfig = function(key){
            return config[key];
}
module.exports.getConfig = getConfig;