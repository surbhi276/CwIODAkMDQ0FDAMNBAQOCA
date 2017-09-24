const winston = require("winston");
const winston_daily_rotate_file = require('winston-daily-rotate-file');
const moment = require("moment");
const util = require('util');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const error_module = {
	"ENOCHANGE": "Log level is already same as asked to change.",
	"ELOGLEVEL": "Log level is not defined in the list."
}
const json_format = require('json-format');
var log_config = (function () {	
	return JSON.parse(fs.readFileSync('./logs_module/config.js', 'utf-8').replace(/^\uFEFF/, ''));	
})();

var log_file_name = log_config.log_file_name;
var log_file_max_size = log_config.log_file_max_size;
var log_file_date_format = log_config.log_file_date_format;
var exception_file_name = log_config.exception_file_name;
var console_log_level = log_config.console_log_level;
var file_log_level = log_config.file_log_level;
var log_folder = log_config.log_folder;
var backup_log_folder = log_config.backup_log_folder;

var syslog_config = {};
syslog_config.levels = {
	none: 0,
	basic: 1,
	error: 2,
	detailed: 3,
	params: 4,
	partialData: 5,
	completeData: 6,
	cellLevel: 7,
	debug: 8
};

//Create custom logger
var logger = new winston.Logger({
    levels: syslog_config.levels,
    transports: [
      new (winston.transports.Console)({
          level: console_log_level,
          json: false,
          timestamp: function () {
          	return (new moment()).format("DD-MMM-YYYY HH:mm:ss");
          },
          formatter: function (options) {
          	return 'Time: ' + options.timestamp() + ', Level: ' + options.level.toUpperCase() + ', Message: ' + (undefined !== options.message ? options.message : '') +
			  (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
          }
      }),
      new (winston.transports.DailyRotateFile)({
      	datePattern: log_file_date_format,
      	filename: path.dirname(__dirname)+ "/"+ log_folder +"/"+ log_file_name, //'shashi.log',
          maxsize: log_file_max_size,
          level: file_log_level,         
          json: false,
          timestamp: function () {
          	return (new moment()).format("DD-MMM-YYYY HH:mm:ss");
          },
          formatter: function (options) {
              return 'Time: ' + options.timestamp() + ', Level: ' + options.level.toUpperCase() + ', Message: ' + (undefined !== options.message ? options.message : '') +
                (options.meta && Object.keys(options.meta).length ? ' ' + JSON.stringify(options.meta) : '');
          }
      }),     
    ],
    exceptionHandlers: [
      new winston.transports.File({
      	filename: path.dirname(__dirname) + "/" + log_folder + "/" + exception_file_name //'exceptions.log'
      })
    ],
    exitOnError: false
});

fs.stat(log_folder, function (err, stats) {
	if (err || !stats.isDirectory())
		fs.mkdirAsync(log_folder).then(null, function (err) {
			throw new Error(err.message);
		});
});


var setConsoleLogLevel = function (logLevel) {
	var fileName = 'config.js_' + new moment().format("DD-MM-YYYY_HHmmss");
	var backupPath = path.join(__dirname, backup_log_folder, fileName);
	
	return fs.readFileAsync('./logs_module/config.js', 'utf-8').then(function (fileContents) {
		return JSON.parse(fileContents.replace(/^\uFEFF/, ''));
	}).then(function (config) {
		if (Object.keys(logger.levels).indexOf(logLevel) == -1) {
			var errMsg = error_module['ELOGLEVEL'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		if (logLevel == config.console_log_level) {
			var errMsg = error_module['ENOCHANGE'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}		
		config.console_log_level = logLevel;
		logger.transports.console.level = logLevel;
		return config;
	}).then(function (config) {		
		return fs.writeFileAsync('./logs_module/configTemp.js', json_format(config));
	}).then(function () {
		return fs.renameAsync('./logs_module/config.js', backupPath);
	}).then(function () {
		return fs.renameAsync('./logs_module/configTemp.js', './logs_module/config.js');
	}).then(function (data) {
		return 'Logging level saved successfully.';
	});
};

logger.setConsoleLogLevel = setConsoleLogLevel;

var setFileLogLevel = function (logLevel) {
	var fileName = 'config.js_' + new moment().format("DD-MM-YYYY_HHmmss");
	var backupPath = path.join(__dirname, backup_log_folder, fileName);

	return fs.readFileAsync('./logs_module/config.js', 'utf-8').then(function (fileContents) {
		return JSON.parse(fileContents.replace(/^\uFEFF/, ''));
	}).then(function (config) {
		if (Object.keys(logger.levels).indexOf(logLevel) == -1) {
			var errMsg = error_module['ELOGLEVEL'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		if (logLevel == config.file_log_level) {
			var errMsg = error_module['ENOCHANGE'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		config.file_log_level = logLevel;
		logger.transports.dailyRotateFile.level = logLevel;
		return config;
	}).then(function (config) {
		return fs.writeFileAsync('./logs_module/configTemp.js', json_format(config));
	}).then(function () {
		return fs.renameAsync('./logs_module/config.js', backupPath);
	}).then(function () {
		return fs.renameAsync('./logs_module/configTemp.js', './logs_module/config.js');
	}).then(function (data) {
		return 'Logging level saved successfully.';
	});
};

logger.setFileLogLevel = setFileLogLevel;

module.exports = logger;


