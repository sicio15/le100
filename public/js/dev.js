'use strict';
/* ===== Dev local: node dev.js → live-reload + no-cache ===== */
process.env.DEV = '1';
const { start } = require('./server.js');
start();