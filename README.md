[![Build Status](https://travis-ci.org/pjanuario/zmq-service-suite-service-js.svg?branch=master)](https://travis-ci.org/pjanuario/zmq-service-suite-service-js)
[![Code Climate](https://codeclimate.com/github/pjanuario/zmq-service-suite-service-js.png)](https://codeclimate.com/github/pjanuario/zmq-service-suite-service-js)
[![Coverage](https://codeclimate.com/github/pjanuario/zmq-service-suite-service-js/coverage.png)](https://codeclimate.com/github/pjanuario/zmq-service-suite-service-js)
[![Dependency Status](https://gemnasium.com/pjanuario/zmq-service-suite-service-js.svg)](https://gemnasium.com/pjanuario/zmq-service-suite-service-js)
![Grunt](https://cdn.gruntjs.com/builtwith.png)

## ZMQ Service Oriented Suite - Node-js Service

This project is a node-js service implementation for [ZMQ Service Suite](http://pjanuario.github.io/zmq-service-suite-specs/).

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
  // broker backend address
  broker: "tcp://127.0.0.1:5561", (optional), defaults to tcp://127.0.0.1:5560
  // service heartbeat interval in ms (optional), defaults to 1s
  heartbeat: 10000
};

var service = new ZSSService(config);

// it register verb ping
service.addVerb('ping', function(payload, message){
  return "PONG";
});

service.run();

```

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
