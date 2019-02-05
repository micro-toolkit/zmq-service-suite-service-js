[![Build Status](https://travis-ci.org/micro-toolkit/zmq-service-suite-service-js.svg?branch=master)](https://travis-ci.org/micro-toolkit/zmq-service-suite-service-js)
[![Code Climate](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js/badges/gpa.svg)](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js)
[![Test Coverage](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js/badges/coverage.svg)](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js/coverage)
[![Issue Count](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js/badges/issue_count.svg)](https://codeclimate.com/github/micro-toolkit/zmq-service-suite-service-js)

## ZMQ Service Oriented Suite - Node-js Service

[![NPM version](https://badge.fury.io/js/zmq-service-suite-service.svg)](http://badge.fury.io/js/zmq-service-suite-service)

This project is a node-js service implementation for [ZMQ Service Suite](http://micro-toolkit.github.io/zmq-service-suite-specs/).

**0MQ Install**

You need to have [0MQ installed](http://zeromq.org/area:download).

If you use MacOS just do

    $ brew install zeromq

## Installation

    npm install zmq-service-suite-service --save

## ZSS Service Usage

```javascript
var ZSSService = require('zmq-service-suite-service');

var config = {
  // service name
  sid: 'test-zmq',
  //(optional) broker backend address, defaults to tcp://127.0.0.1:5560
  broker: "tcp://127.0.0.1:5561",
  // service heartbeat interval in ms (optional), defaults to 1s
  heartbeat: 1000
};

var service = new ZSSService(config);

// it register verb ping
service.addVerb('ping', function(payload, message, callback){
  callback(null, "PONG");
});

service.run();

```

### Service Errors

#### Errors Shielding

The service library implementation will be shielding service errors, this will avoid unexpected information disclosure.
The library will catch unexpected errors while running the service handlers/verbs and this errors will be translated to a default 500 error payload (see the example bellow) and 500 status code.

*NOTE: This isn't the proper approach to return errors, it's just a safe net to avoid service interruption. Please take a look on the information bellow to see how to return errors properly.*

```javascript
var service = new ZSSService(config);

// it register verb ping
service.addVerb('ping', function(payload, message, callback){
  throw new Error("ups, this should happen!");
});

```

The payload on service response will be the following and 500 status code will be sent.

```json
{
  "developerMessage": "There was an error while processing this request. There is probably something wrong with the API server.",
  "userMessage": "There was an error while processing this request.",
  "errorCode": 500
}
```

#### Error Handling

To properly return a error from the service, we can do it using callback:
* with a generic error
* with a ZSS error (duck type interface)

**Generic Error**

When the callback is called with a non zss error contract the default 500 error will be sent in the response.

```javascript
service.addVerb('ping', function(payload, message, callback){
  callback(new Error("ups, this should happen!"), null);
});
```

**ZSS Error**

The library uses a error duck type interface and every error that isn't according to this interface will be translated to the default 500 error.

*Error Duck Type Interface*

```json
{
  "developerMessage": "A developer readable message",
  "userMessage": "This message could have less information and could be used for non technical interfaces",
  "errorCode": 500
}
```

*Errors dictionary*

The library components uses a dictionary that maps directly to http status codes, this dictionaries can be copied or used on service implementations. The service could use their own errors dictionary and/or add extra information to user and developer messages.

```javascript
// this will be returned as 400 status code error and with error payload
service.addVerb('returnZSSError', function(payload, message, callback){
  callback({
    developerMessage: "The request cannot be fulfilled due to bad syntax. You are missing the following required fields.",
    userMessage: "Please fill the following fields: name, date.",
    errorCode: 400
  }, null);
});

```

## System Metrics

The library publishes some log events related with metrics of the system and some headers are added to the response along the way to identify the timestamp of the different events. with the timestamp in milliseconds.

The following sigles are used for each component identification:
* `c` - stands for client
* `s` - stands for service
* `bfe` - stands for broker frontend
* `bbe` - stands for broker backend
* `b` - stands for broker

The following sigles are used for each socket event:
* `s` - stands for message sent
* `r` - stands for message receive

The following spans are used to identify the different component traces:

* `micro.cb.span`: Identifies the time it takes since the client sent the request until the broker receives it (`micro.cs - micro.bfer`).
* `micro.bfe.span`: Identifies the time it takes since the broker receives the request until it processes it to send through the backend (internal broker actions) (`micro.bbes - micro.bfer`).
* `micro.bs.span`: Identifies the time it takes since the broker sends the request until it is received in the service (`micro.sr - micro.bbes`).
* `micro.s.span`: Identifies the time it takes since the service received the request until the response is sent (`micro.ss - micro.sr`).
* `micro.sb.span`: Identifies the time it takes since the service sent the response until the response is received in the broker (`micro.bber - micro.ss`).
* `micro.bbe.span`: Identifies the time it takes since the broker received the response until the response is sent through the broker frontend (internal broker actions) (`micro.bfes - micro.bber`).
* `micro.bc.span`: Identifies the time it takes since the broker sent the response until the response is received in the client (`micro.cr - micro.bfes`).
* `micro.c.span`: Identifies the time it takes since the client sent the request until the response is received in the client (`micro.cr - micro.cs`).

The following headers are added by the service to calculate the metrics:

* When receiving a new request adds the header `micro.sr` of the request receive time.
* When it sends the response adds the header `micro.ss` of the response send time.

The following metrics are calculated when the request is received and response is sent:

* `micro.bs.span`: Identifies the time it takes since the broker sent the request until the it is received in the service (`micro.sr - micro.bbes`).
* `micro.s.span`: Identifies the time it takes since the request was received until the response is sent (`micro.sr - micro.ss`).

`micro.s.span` - Allows to identify the full span of a particular request in the context of the service operation.

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## Bump versioning

We use [grunt bump package](https://www.npmjs.org/package/grunt-bump) to control package versioning.

Bump Patch version

    $ grunt bump

Bump Minor version

    $ grunt bump:minor

Bump Major version

    $ grunt bump:major

## Running Specs

    $ npm test

## Coverage Report

We aim for 100% coverage and we hope it keeps that way! :)
We use pre-commit and pre-push hooks and CI to accomplish this, so don't mess with our build! :P

Check the report after running npm test.

    $ open ./coverage/lcov-report/index.html
