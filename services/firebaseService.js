const admin = require('firebase-admin');
require('dotenv').config(); 

admin.initializeApp({
    credential: admin.credential.cert(require(process.env.FIREBASE_PATH)),
});


const verifyEmailInFirebase = async (email) => {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`User "${userRecord.email}" is verified in Firebase`);
        return userRecord;
    } catch (error) {
        console.error('Error verifying email in Firebase:', error.message);
        throw new Error('Email not found in Firebase');
    }
};

module.exports = { verifyEmailInFirebase };
