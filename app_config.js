var config = {};
config['currency_converter_API'] = 'http://www.xe.com/currencyconverter/convert/?Amount=1&From={from}&To={to}#converter';
config['currency_rate'] = '.uccResultAmount';
config['mongo_server'] = {
	                        host: "localhost",
	                        port: "27017",
	                        db_name: "EXCHANGEDB",
                            collection_name: "ExchangeRates"
                        };
config['beanstalkd_server'] = {
                            host : 'challenge.aftership.net',
                            port : '11300',
                            tube : 'SURBHI276'
                           };
config['success_wait_duration'] = 60; //in seconds
config['exchange_rate_successful_retry_count'] = 10;
config['exchange_rate_failed_wait_duration'] = 3000;//in milliseconds
config['exchange_rate_failed_retry_count'] = 3;
config['exchange_rate_fixed_decimal_value'] = 2;

config["server_port"] = 9005;

config["no_of_processes"] = 1;
var getConfig = function(key){
            return config[key];
}
module.exports.getConfig = getConfig;