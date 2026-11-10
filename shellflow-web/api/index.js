// Vercel runs this file as a single serverless function
const { createApp } = require('../server/app');

module.exports = createApp();
