var admin = require("firebase-admin");

var serviceAccount = require("./secrets/firebaseServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin