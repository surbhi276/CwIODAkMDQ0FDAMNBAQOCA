const cluster = require('cluster');
const express = require('express');
const logger = require('./logs_module/logs_module.js');
const app_config = require('./app_config');
const bodyParser = require('body-parser');
const currency_conversion_job = require('./currency_conversion_job');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var port = app_config.getConfig("server_port");

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + '/bower_components'));

// ExchangeRate Api to get the data of rates.
app.post('/exchangeRates', function (req, res) {
    logger.log('basic','Entering to the Exchange Rate API with ',{data: req.body});
    var obj = { from: req.body.from, to: req.body.to, counter: 1 };
    return currency_conversion_job.findExchangeRate(obj).then(function (exchangeRate) {
        return currency_conversion_job.schedulingJob(obj).then(function (jobId) {
            res.send({ result: exchangeRate, jobId: jobId });
        });
    });
});

//stats_tube Api to get the status of Tube used in beanstalkd server.
app.get('/stats_tube', function (req, res) {
    currency_conversion_job.beanstalkdConnection().then(function (conn) {
        conn.stats_tube(app_config.getConfig('beanstalkd_server').tube, function (err, response) {
            res.send([response]);
        });
    });
});

var workers = app_config.getConfig("no_of_processes") || process.env.WORKERS || require('os').cpus().length;

if (cluster.isMaster) {
     logger.log('basic', 'start cluster with %s workers', workers);
    for (var i = 0; i < workers; i++) {
        cluster.fork();
    }

    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });

} else {
    currency_conversion_job.processingQueueJob();
    process.on('SIGINT', function () {
        currency_conversion_job.killQueueConnection();
        process.exit(0);
    });  

    app.listen(port, function () {
        console.log("server started on " + port);
        logger.log('basic', 'server started on', port);
    });
}
