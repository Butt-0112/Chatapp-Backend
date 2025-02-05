var admin = require("firebase-admin");

var serviceAccount = require('./livechat-4ea6c-firebase-adminsdk-fbsvc-1b79b8250e.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin