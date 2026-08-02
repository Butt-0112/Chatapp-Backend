// routes/video.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
 
router.post('/token', (req, res) => {
  const payload = {
    apikey: process.env.VIDEOSDK_API_KEY,
    permissions: ['allow_join'],
    version: 2,
  };

  const token = jwt.sign(payload, process.env.VIDEOSDK_SECRET, {
    algorithm: 'HS256',
    expiresIn: '2h', // short-lived, generated fresh per call — don't reuse long-term
  });

  res.json({ token });
});

module.exports = {VideoRouter: router};