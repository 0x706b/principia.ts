"use strict";
exports.__esModule = true;
var I = require("@principia/base/IO");
var Q = require("@principia/base/Queue");
var q = Q.boundedQueue(10);
I.bind_(q, function (q) { return Q.offer_(q, 'x'); });
