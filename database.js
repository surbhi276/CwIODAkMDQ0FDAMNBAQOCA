const Promise = require('bluebird');
const mongo_client = require('mongodb').MongoClient;
const logger = require('./logs_module/logs_module.js');
const app_config = require('./app_config');
var mongo_URL = 'mongodb://'+app_config.getConfig('mongo_server').host+':'+app_config.getConfig('mongo_server').port+'/'+app_config.getConfig('mongo_server').db_name;

var connect = mongo_client.connect(mongo_URL, { server: { poolSize: 50 } }).then(function (db) {
    logger.log('detailed', 'Connection established to mongo server', { mongo_URL : mongo_URL});
    db.on("close", function () {
        logger.log('detailed', 'Mongo Connection has been closed', { mongo_URL : mongo_URL});
        console.log('closed:', mongo_URL);
    }).on("reconnect", function () {
        logger.log('detailed', 'Mongo Connection has been reconnected', { mongo_URL : mongo_URL});
        console.log('reconnected:', mongo_URL);
    });
    return db;
}).catch(function (err) {
    logger.log('error', 'Error in connecting to mongo URL:', {error : err , mongo_URL : mongo_URL});
});


/*function used to save the data of currency exchange rates in mongo db
inputs :-  rates, from currency ,  to currency ,  timestamp ,  counter ,(type :- array)
output :- saved/notsaved
*/
function saveToMongo(data) {
    logger.log('detailed', 'Entering to saveToMongo() function with ', { data : data});
    return new Promise(function (resolve, reject) {
        connect.then(function (db) {
            var collection = db.collection(app_config.getConfig('mongo_server').collection_name);
            var rateToSave = {
                "from": data[1].from,
                "to": data[1].to,
                "counter":data[1].counter,
                "created_at": new Date(),
                "rate": data[0]
            };
            collection.insertOne(rateToSave, function (err, request) {
                if (err) {
                    logger.log('error', 'Error while inserting data in mongo', {error : err});
                    data[0] = err;
                    reject(data);
                } else {
                    resolve(request);
                }
            });
        }, function (e) {
            logger.log('error', 'Error occured while connecting to mongo', {error : e});
            data[0] = e;
            reject(data);
        });
    });
}
module.exports.saveToMongo = saveToMongo