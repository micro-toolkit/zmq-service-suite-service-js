var _ = require('lodash');
var moment = require('moment');
var Logger = require('logger-facade-nodejs');
var log = Logger.getLogger('micro.metric.service');

// Add Test: Add proper test to ensure the format of the metric, mocking logger was giving troubles
function metric(name, val, message) {
  // val is not a NaN should log the metric
  if (isNaN(val)) { return message; }

  var metadata = _.pick(message, ['type', 'rid', 'address', 'status', 'client', 'clientId', 'transaction']);
  metadata['micrometric'] = { name: name, value: val }
  log.info(metadata, 'Publishing metric "%s":%sms', name, val);
  return metadata;
}

function recordTimestamp(message, name) {
  var now = moment().valueOf();

  // add the micro service receive timestamp
  var ts = {};
  ts[name] = now;
  message.headers = _.defaults(message.headers, ts);
  metric(name, now, message);

  return now;
}

function start(message) {
  var now = recordTimestamp(message, 'micro.sr');

  var bbes = message.headers['micro.bbes'];
  metric('micro.bs.span', now - bbes, message);

  return message;
}

function end(message) {
  var now = recordTimestamp(message, 'micro.ss');

  var sr = message.headers['micro.sr'];
  metric('micro.s.span', now - sr, message);

  return message;
}

module.exports = {start: start, end: end};
