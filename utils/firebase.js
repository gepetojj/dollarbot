require("dotenv").config();
const firebase = require("firebase-admin");

const config = {
    type: "service_account",
    project_id: "dollarbot-ds",
    private_key_id: process.env.PKID,
    private_key: process.env.PK.replace(/\\n/g, '\n'),
    client_email: process.env.CEMAIL,
    client_id: process.env.CID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.CURL,
};

firebase.initializeApp({
    credential: firebase.credential.cert(config),
    databaseURL: "https://dollarbot-ds.firebaseio.com",
    storageBucket: "dollarbot-ds.appspot.com",
});

module.exports = firebase;
