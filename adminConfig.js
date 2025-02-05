var admin = require("firebase-admin");

var serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = admin