var admin = require("firebase-admin");
require('dotenv').config()
var serviceAccount = require('./etc/secrets/fir-cloud-messaging-7a490-firebase-adminsdk-wa6wp-1947a643f1.json')


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin