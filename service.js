(function() {
  var zmq = require('zmq'),
      errors = require('./config/errors'),
      Logger = require('logger-facade-nodejs'),
      uuid = require('uuid'),
      _ = require('lodash'),
      Message = require('zmq-service-suite-message');

  var ZSSService = function(configuration){

    var log = Logger.getLogger('ZSSService');

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
      log.error("Received zmq error => %s", error.stack);
    };

    var reply = function(message){
      message.type = Message.Type.REP;

      log.info("Reply to: %s with status: %s", message.identity, message.status);
      log.debug(message.toString());

      socket.send(message.toFrames());
    };



    var replyError = function(error, message){
      message.status = error.code;
      message.payload = error.body;
      reply(message);
    };

    var replyErrorCode = function(errorCode, message){
      var error = errors[errorCode.toString()];
      replyError(error, message);
    };

    var sendRequest = function(message){
      message.identity = identity;

      log.info("Sending %s to %s:%s",
        message.identity, message.address.sid, message.address.verb);
      log.debug(message.toString());

      socket.send(message.toFrames());
    };

    var onMessage = function(){
      var frames = _.toArray(arguments);
      var msg = Message.parse(frames);

      log.info("Received %s from: %s to: %s:%s",
        msg.type, msg.identity, msg.address.sid, msg.address.verb);

      log.debug(msg.toString());

      if(msg.type === Message.Type.REP) {
        log.info("Reply received from %s:%s with status %s",
          msg.address.sid, msg.address.verb, msg.status);

        // if is down message
        socketClose = (msg.address.sid === "SMI" && msg.address.verb === "DOWN");

        return;
      }

      var verb = routing[msg.address.verb.toUpperCase()];
      var isValidAction = msg.address.sid === config.sid && verb != null;
      if(!isValidAction){
        // reply with error
        log.error("Invalid address => %j", msg.address);
        replyErrorCode(404, msg);
        return;
      }

      log.debug("Message routed to %s...", msg.address.verb);

      try {
        // TODO: replace sync execution by eventfull
        // check this http://stackoverflow.com/questions/7310521/node-js-best-practice-exception-handling
        msg.payload = verb(msg.payload, msg);
        // reply with success message
        msg.status = 200;
        reply(msg);
      }
      catch(error){
        log.error("An error occurred while executing action: ", error);
        replyErrorCode(500, msg);
      }
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
      heartbeatIntervalObj = setInterval(function() {
        var msg = new Message("SMI", "HEARTBEAT");
        msg.payload = config.sid;
        sendRequest(msg);
      }, config.heartbeat);
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
}());
