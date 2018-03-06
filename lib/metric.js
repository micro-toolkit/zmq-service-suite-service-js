var _ = require('lodash');
var moment = require('moment');
var Logger = require('logger-facade-nodejs');
var log = Logger.getLogger('micro.metric.service');

// TODO: Add proper test to ensure the format of the metric, mocking logger was giving troubles
function metric(name, val, message) {
  // val is not a NaN should log the metric
  if (isNaN(val)) { return message; }

  var metadata = _.pick(message, ['type', 'rid', 'address', 'status', 'client', 'clientId', 'transaction']);
  metadata['micrometric'] = { name: name, value: val }
  log.info(metadata, 'Publishing metric "%s":%sms', name, val);
  return metadata;
}

function start(message) {
  var now = moment().valueOf();

  // add the micro service receive timestamp
  message.headers = _.defaults(message.headers, {'micro.sr': now});
  metric('micro.sr', now, message);

  var bbes = message.headers['micro.bbes'];
  metric('micro.bs.span', now - bbes, message);

  return message;
}

function end(message) {
  var now = moment().valueOf();

  // add the micro service send timestamp
  message.headers = _.defaults(message.headers, {'micro.ss': now});
  metric('micro.ss', now, message);

  var sr = message.headers['micro.sr'];
  metric('micro.s.span', now - sr, message);

  return message;
}

module.exports = {start: start, end: end};
