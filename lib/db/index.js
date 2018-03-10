const mongoose = require('mongoose');
const conf = require('../../conf/conf');

const connect = () => {
  let url = "mongodb://";
  if (conf.db.username && conf.db.password) {
    console.log('Authentication enabled');
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
