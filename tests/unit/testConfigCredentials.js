/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var path = require('path');
var assert = require('assert');
var nock = require('nock');
var http = require('http');
var express = require('express');

var originalHandlers = process.listeners('uncaughtException');

function reattachOriginalListeners() {
  for (var i = 0; i < originalHandlers.length; i++) {
    process.on('uncaughtException', originalHandlers[i]);
  }
}

process.env.GCLOUD_PROJECT = '0';
process.env.NODE_ENV = 'production';

describe('test-config-credentials', function() {
  it('should use the keyFilename field of the config object', function(done) {
    process.removeAllListeners('uncaughtException');
    var credentials = require('../fixtures/gcloud-credentials.json');
    var config = {
      keyFilename: path.join('tests', 'fixtures', 'gcloud-credentials.json'),
      reportUncaughtExceptions: false
    };
    var agent = require('../..').start(config);
    var app = express();
    app.use('/', function () {
      throw '0';
    });
    app.use(agent.express);
    var server = app.listen(3000, function() {
      nock.disableNetConnect();
      nock.enableNetConnect('localhost');
      var scope = nock('https://accounts.google.com')
        .intercept('/o/oauth2/token', 'POST', function(body) {
          assert.equal(body.client_id, credentials.client_id);
          assert.equal(body.client_secret, credentials.client_secret);
          assert.equal(body.refresh_token, credentials.refresh_token);
          return true;
        }).reply(200, {
          refresh_token: 'hello',
          access_token: 'goodbye',
          expiry_date: new Date(9999, 1, 1)
        });

      // Since we have to get an auth token, this always gets intercepted second
      nock('https://clouderrorreporting.googleapis.com/v1beta1/projects')
        .post('/0/events:report', function() {
          assert(scope.isDone());
          nock.cleanAll();
          server.close();
          reattachOriginalListeners();
          setImmediate(done);
          return true;
        }).reply(200);

      http.get({port: 3000, path: '/'}, function(res) {});
    });
  });

  it('should use the credentials field of the config object', function(done) {
    process.removeAllListeners('uncaughtException');
    var config = {
      credentials: require('../fixtures/gcloud-credentials.json'),
      reportUncaughtExceptions: false
    };
    var agent = require('../..').start(config);
    var app = express();
    app.use('/', function () {
      throw '0';
    });
    app.use(agent.express);
    var server = app.listen(3000, function() {
      nock.disableNetConnect();
      nock.enableNetConnect('localhost');
      var scope = nock('https://accounts.google.com')
        .intercept('/o/oauth2/token', 'POST', function(body) {
          assert.equal(body.client_id, config.credentials.client_id);
          assert.equal(body.client_secret, config.credentials.client_secret);
          assert.equal(body.refresh_token, config.credentials.refresh_token);
          return true;
        }).reply(200, {
          refresh_token: 'hello',
          access_token: 'goodbye',
          expiry_date: new Date(9999, 1, 1)
        });

      // Since we have to get an auth token, this always gets intercepted second
      nock('https://clouderrorreporting.googleapis.com/v1beta1/projects')
        .post('/0/events:report', function() {
          assert(scope.isDone());
          nock.cleanAll();
          server.close();
          reattachOriginalListeners();
          setImmediate(done);
          return true;
        }).reply(200);

      http.get({port: 3000, path: '/'}, function(res) {});
    });
  });

  it('should ignore credentials if keyFilename is provided', function(done) {
    process.removeAllListeners('uncaughtException');
    var correctCredentials = require('../fixtures/gcloud-credentials.json');
    var config = {
      keyFilename: path.join('tests', 'fixtures', 'gcloud-credentials.json'),
      credentials: {
        client_id: 'a',
        client_secret: 'b',
        refresh_token: 'c',
        type: 'authorized_user'
      },
      reportUncaughtExceptions: true
    };
    ['client_id', 'client_secret', 'refresh_token'].forEach(function (field) {
      assert(correctCredentials.hasOwnProperty(field));
      assert(config.credentials.hasOwnProperty(field));
      assert.notEqual(config.credentials[field],
        correctCredentials[field]);
    });
    var agent = require('../..').start(config);
    var app = express();
    app.use('/', function () {
      throw '0';
    });
    app.use(agent.express);
    var server = app.listen(3000, function() {
      nock.disableNetConnect();
      nock.enableNetConnect('localhost');
      var scope = nock('https://accounts.google.com')
        .intercept('/o/oauth2/token', 'POST', function(body) {
          assert.equal(body.client_id, correctCredentials.client_id);
          assert.equal(body.client_secret, correctCredentials.client_secret);
          assert.equal(body.refresh_token, correctCredentials.refresh_token);
          return true;
        }).reply(200, {
          refresh_token: 'hello',
          access_token: 'goodbye',
          expiry_date: new Date(9999, 1, 1)
        });

      // Since we have to get an auth token, this always gets intercepted second
      nock('https://clouderrorreporting.googleapis.com/v1beta1/projects')
        .post('/0/events:report', function() {
          assert(scope.isDone());
          nock.cleanAll();
          server.close();
          reattachOriginalListeners();
          setImmediate(done);
          return true;
        }).reply(200);

      http.get({port: 3000, path: '/'}, function(res) {});
    });
  });
});
