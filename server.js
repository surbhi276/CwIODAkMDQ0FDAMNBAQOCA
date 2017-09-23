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

app.post('/exchangeRates', function (req, res) {
    logger.log('basic','Entering to the Exchange Rate API with ',{data: req.body});
    var obj = { from: req.body.from, to: req.body.to, counter: 1 };
    return currency_conversion_job.findExchangeRate(obj).then(function (exchangeRate) {
        return currency_conversion_job.schedulingJob(obj).then(function (jobId) {
            res.send({ result: exchangeRate, jobId: jobId });
        });
    });
});

// app.get('/list_tube_used', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.list_tube_used(function (err, tubename) {
//             res.send([tubename]);
//         });
//     });
// });
// app.get('/put', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.put(1, req.query.delay, 100, JSON.stringify(req.query.payload), function (err, jobid) {
//             res.send([jobid]);
//         });
//     });
// });
// app.get('/peek_ready', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.peek_ready(function (err, jobid, payload) {
//             res.send([{ jobid: jobid, payload: payload }]);
//         });
//     });
// });
// app.get('/reserve', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.reserve(function (err, jobid, payload) {
//             res.send([{ jobid: jobid, payload: payload }]);
//         });
//     });
// });
// app.get('/destroy', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.destroy(req.query.jobid, function (err) {
//             res.send([req.query.jobid]);
//         });
//     });
// });
// app.get('/peek', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.peek(function (err, jobid, payload) {
//             res.send([{ jobid: jobid, payload: payload }]);
//         });
//     });
// });
// app.get('/stats_job', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.stats_job(req.query.jobid, function (err, response) {
//             res.send([response]);
//         });
//     });
// });
app.get('/stats_tube', function (req, res) {
    currency_conversion_job.beanstalkdConnection().then(function (conn) {
        conn.stats_tube(app_config.getConfig('beanstalkd_server').tube, function (err, response) {
            res.send([response]);
        });
    });
});
// app.get('/stats', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.stats(function (err, response) {
//             res.send([response]);
//         });
//     });
// });
// app.get('/release', function (req, res) {
//     currency_conversion_job.beanstalkdConnection().then(function (conn) {
//         conn.release(jobid, priority, delay, function (err) {
//             res.send(err || null);
//         });
//     });
// });

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
