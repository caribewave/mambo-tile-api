const mongoose = require('mongoose');
const conf = require('../../conf/conf');
const Logger = require('../log/Logger')('DB');

const connect = () => {
  let url = "mongodb://";
  if (conf.db.username && conf.db.password) {
    Logger.info('Authentication enabled');
    url += conf.db.username + ":" + conf.db.password + "@";
  }
  url += conf.db.host;
  if (conf.db.port) {
    url += ":" + conf.db.port;
  }
  url += "/" + conf.db.database;
  mongoose.connect(url);
};

module.exports = {
  connect
};
