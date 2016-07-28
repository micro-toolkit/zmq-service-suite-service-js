var zmq = require('zmq'),
    errors = require('./config/errors'),
    Logger = require('logger-facade-nodejs'),
    uuid = require('uuid'),
    _ = require('lodash'),
    Message = require('zmq-service-suite-message'),
    timer = require('./lib/timer');

function getClientId(identity) {
  // identity frame is unique and contain client id + rid
  // API#acf82370-540d-11e6-ab59-5f94a31b4896
  return identity.split('#')[0];
}

function isValidSuccessCode(code){
  return code >= 200 && code < 300;
}

function getStatusCode(code, payload) {
  if (code) { return code; }

  return payload ? 200 : 204;
}

function getResponseTime(msg) {
  return msg.headers["response-time"];
}

function setResponseTime(msg, start) {
  msg.headers["response-time"] = timer.time(start);
}

var ZSSService = function(configuration){

  var log = Logger.getLogger('micro:service');

  var defaults = {
    broker: 'tcp://127.0.0.1:5560',
    heartbeat: 1000,
    sid: null
  };

  var config = _.defaults(configuration, defaults);

  if (!config.sid) {
    throw new Error("A sid must be passed!");
  }

  config.sid = config.sid.toUpperCase();

  var routing = {};

  var identity = config.sid + "#" + uuid.v1();
  var socket = zmq.socket('dealer');
  var heartbeatIntervalObj;
  var socketClose = false;

  var onError = function(error){
    // reply with error
    log.error(error, "Received zmq error: %s with stack: %s", error, error.stack);
  };

  var reply = function(message){
    message.type = Message.Type.REP;

    log.info(message, "Reply to %s with id %s from %s:%s#%s with status %s took %s ms", getClientId(message.identity), message.rid,
      message.address.sid, message.address.sversion, message.address.verb, message.status, getResponseTime(message));

    socket.send(message.toFrames());
  };

  var isValidError = function(error){
    return error && error.code && error.userMessage &&
      error.developerMessage;
  };

  var replyError = function(error, message){
    message.status = error.code;
    message.payload = error;
    reply(message);
  };

  var replyErrorCode = function(errorCode, message){
    var error = errors[errorCode.toString()];
    replyError(error, message);
  };

  var replyServiceError = function(error, message){
    if(!isValidError(error)) {
      log.warn(error, "A error occorred in the service: %s", error.stack);
      return replyErrorCode(500, message);
    }

    // convert to integer status code
    message.status = parseInt(error.code, 10);
    message.payload = error;
    reply(message);
  };
  var sendRequest = function(message){
    message.identity = identity;

    log.info(message, "Sending %s with id %s to %s:%s#%s", message.identity, message.rid, message.address.sid,
      message.address.sversion, message.address.verb);

    socket.send(message.toFrames());
  };

  var handleResponse = function(msg){
    var isSMI = msg.address.sid === "SMI";
    var isHeartbeat = msg.address.verb === "HEARTBEAT";

    var logLevel = (isSMI && isHeartbeat) ? "trace" : "info";

    // heartbeats should be logged in trace mode
    log[logLevel]("Reply received from %s:%s with status %s",
      msg.address.sid, msg.address.verb, msg.status);

    // if is down message
    socketClose = (isSMI && msg.address.verb === "DOWN");
  };

  var onMessage = function(){
    var frames = _.toArray(arguments);
    var msg = Message.parse(frames);
    var start = timer.start();

    if(msg.type === Message.Type.REP) {
      return handleResponse(msg);
    }

    log.info(msg, "Received REQ from %s with id %s to %s:%s#%s", getClientId(msg.identity), msg.rid,
      msg.address.sid, msg.address.sversion, msg.address.verb);

    var verb = routing[msg.address.verb.toUpperCase()];
    var isValidAction = msg.address.sid === config.sid && verb != null;
    if(!isValidAction){
      // reply with error
      log.error(msg, "Invalid address: %s:%s#%s", msg.address.sid, msg.address.sversion, msg.address.verb);
      replyErrorCode(404, msg);
      return;
    }

    log.trace("Message routed to %s...", msg.address.verb);

    try {
      verb(msg.payload, msg, function(err, payload){
        setResponseTime(msg, start);
        if (err) { return replyServiceError(err, msg); }
        if (msg.status && !isValidSuccessCode(msg.status)){
          log.warn(msg, "The service returned a invalid success status code: %s", msg.status);
          return replyErrorCode(500, msg);
        }

        msg.payload = payload;
        // reply with success message
        msg.status = getStatusCode(msg.status, payload);
        reply(msg);
      });
    }
    catch(error){
      log.error(error, "An error occurred while executing action: %s stack: %s", error, error.stack);
      setResponseTime(msg, start);
      replyErrorCode(500, msg);
    }
  };

  var sendHeartbeat = function() {
    var message = new Message("SMI", "HEARTBEAT");
    message.payload = config.sid;
    message.identity = identity;

    log.trace("Sending %s to %s:%s",
      message.identity, message.address.sid, message.address.verb);

    socket.send(message.toFrames());
  };

  // public methods

  this.addVerb = function(verb, callback){
    routing[verb.toUpperCase()] = callback;
  };

  this.addVerbs = function(verbs) {
    verbs.forEach(function(verb) {
      this.addVerb(verb[0], verb[1]);
    }, this);
  };

  this.run = function(){
    socket.identity = identity;
    socket.linger = 0;
    socket.on('message', onMessage.bind(this));
    socket.on('error', onError.bind(this));
    socket.connect(config.broker);

    log.info('%s connected to %s', identity, config.broker);

    // send announcement message
    var msg = new Message("SMI", "UP");
    msg.payload = config.sid;
    sendRequest(msg);

    // register heartbeat send
    heartbeatIntervalObj = setInterval(sendHeartbeat, config.heartbeat);
  };

  this.stop = function(){
    log.info('%s disconnecting from %s', identity, config.broker);

    // clear interval
    clearInterval(heartbeatIntervalObj);

    var msg = new Message("SMI", "DOWN");
    msg.payload = config.sid;
    sendRequest(msg);

    // wait for message reply
    var stoping = function() {

      if(socketClose){
        log.info('%s disconnected from %s', identity, config.broker);
        socket.close();
      }
      else {
        setTimeout(stoping, 500);
      }
    };
    stoping();
  };
};

module.exports = ZSSService;
