var Message = require('zmq-service-suite-message');

describe('metric', function() {
  var msg, log;
  var metric = require('../../lib/metric');

  beforeEach(function () {
    msg = new Message('sid', 'verb');
    msg.identity = 'some#1';
    msg.type = Message.Type.REQ;
  });

  describe('#start', function() {
    it('should return the message', function () {
      expect(metric.start(msg)).toEqual(msg);
    });

    it('should return the message when headers not present', function () {
      msg.headers = null;
      expect(metric.start(msg)).toEqual(msg);
    });

    it('should add micro.sr header', function () {
      var message = metric.start(msg);
      var expected = message.headers['micro.sr'];
      expect(expected).not.toBe(undefined);
    });
  });

  describe('#end', function() {
    it('should return the message', function () {
      expect(metric.end(msg)).toEqual(msg);
    });

    it('should return the message when headers not present', function () {
      msg.headers = null;
      expect(metric.end(msg)).toEqual(msg);
    });

    it('should add micro.ss header', function () {
      var message = metric.end(msg);
      var expected = message.headers['micro.ss'];
      expect(expected).not.toBe(undefined);
    });
  });
});
