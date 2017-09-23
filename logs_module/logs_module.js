const winston = require("winston");
const winstonDailyRotateFile = require('winston-daily-rotate-file');
const moment = require("moment");
const util = require('util');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const error_module = {
	"ENOCHANGE": "Log level is already same as asked to change.",
	"ELOGLEVEL": "Log level is not defined in the list."
}
const jsonFormat = require('json-format');
var logConfig = (function () {	
	return JSON.parse(fs.readFileSync('./logs_module/config.js', 'utf-8').replace(/^\uFEFF/, ''));	
})();

var logFileName = logConfig.logFileName;
var logFileMaxSize = logConfig.logFileMaxSize;
var logFileDateFormat = logConfig.logFileDateFormat;
var exceptionFileName = logConfig.exceptionFileName;
var consoleLogLevel = logConfig.consoleLogLevel;
var fileLogLevel = logConfig.fileLogLevel;
var logFolder = logConfig.logFolder;
var backupLogFolder = logConfig.backupLogFolder;

var syslogConfig = {};
syslogConfig.levels = {
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
    levels: syslogConfig.levels,
    transports: [
      new (winston.transports.Console)({
          level: consoleLogLevel,
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
      	datePattern: logFileDateFormat,
      	filename: path.dirname(__dirname)+ "/"+ logFolder +"/"+ logFileName, //'shashi.log',
          maxsize: logFileMaxSize,
          level: fileLogLevel,         
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
      	filename: path.dirname(__dirname) + "/" + logFolder + "/" + exceptionFileName //'exceptions.log'
      })
    ],
    exitOnError: false
});

fs.stat(logFolder, function (err, stats) {
	if (err || !stats.isDirectory())
		fs.mkdirAsync(logFolder).then(null, function (err) {
			throw new Error(err.message);
		});
});


var setConsoleLogLevel = function (logLevel) {
	var fileName = 'config.js_' + new moment().format("DD-MM-YYYY_HHmmss");
	var backupPath = path.join(__dirname, backupLogFolder, fileName);
	
	return fs.readFileAsync('./logs_module/config.js', 'utf-8').then(function (fileContents) {
		return JSON.parse(fileContents.replace(/^\uFEFF/, ''));
	}).then(function (config) {
		if (Object.keys(logger.levels).indexOf(logLevel) == -1) {
			var errMsg = error_module['ELOGLEVEL'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		if (logLevel == config.consoleLogLevel) {
			var errMsg = error_module['ENOCHANGE'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}		
		config.consoleLogLevel = logLevel;
		logger.transports.console.level = logLevel;
		return config;
	}).then(function (config) {		
		return fs.writeFileAsync('./logs_module/configTemp.js', jsonFormat(config));
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
	var backupPath = path.join(__dirname, backupLogFolder, fileName);

	return fs.readFileAsync('./logs_module/config.js', 'utf-8').then(function (fileContents) {
		return JSON.parse(fileContents.replace(/^\uFEFF/, ''));
	}).then(function (config) {
		if (Object.keys(logger.levels).indexOf(logLevel) == -1) {
			var errMsg = error_module['ELOGLEVEL'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		if (logLevel == config.fileLogLevel) {
			var errMsg = error_module['ENOCHANGE'];
			logger.log('error', errMsg);
			throw new Error(errMsg);
		}
		config.fileLogLevel = logLevel;
		logger.transports.dailyRotateFile.level = logLevel;
		return config;
	}).then(function (config) {
		return fs.writeFileAsync('./logs_module/configTemp.js', jsonFormat(config));
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


