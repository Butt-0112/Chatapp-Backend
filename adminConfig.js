var admin = require("firebase-admin");
require('dotenv').config()
var serviceAccount = require("/etc/secrets/firebaseServiceAccount.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin