const ora = require('ora');
const chalk = require('chalk');
const spinner = ora();

class Logger {

  constructor(className) {
    this.debugLog = console.debug;
    this.log = console.log;
    this.errorLog = console.error;
    
    this.className = className ? (className + '-') : '';
    this.errorPrefix = '[' + this.className + 'E] ';
    this.warnPrefix = '[' + this.className + 'W] ';
    this.infoPrefix = '[' + this.className + 'I] ';
    this.debugPrefix = '[' + this.className + 'D] ';
  }
  
  error(msg) {
    this.errorLog('  ' + this.errorPrefix + chalk.bold.red(msg));
  }

  warn(msg) {
    this.log('  ' + this.warnPrefix + chalk.bold.orange(msg));
  }

  info(msg) {
    this.log('  ' + this.infoPrefix + msg);
  }

  debug(msg) {
    this.debugLog('  ' + this.debugPrefix + chalk.yellow(msg));
  }
  
  spinner() {
    const self = this;
    return {
      start: (text) => {
        return spinner.start(text ? (self.infoPrefix + text) : undefined);
      },
      text: (text) => {
        spinner.text = self.infoPrefix + text; 
      },
      fail: (text) => {
        return spinner.fail(text ? (self.infoPrefix + chalk.red(text)) : undefined);
      },
      succeed: (text) => {
        return spinner.succeed(text ? (self.infoPrefix + chalk.green(text)) : undefined);
      },
      clear: () => {
        return spinner.clear();
      }
    }
  }
}

module.exports = (className) => {return new Logger(className);};
