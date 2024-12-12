const admin = require('firebase-admin');

const initializeFirebase = () => {
    try {
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!serviceAccountBase64) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in environment variables');
        }

        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error.message);
        throw error;
    }
};

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

module.exports = { initializeFirebase, verifyEmailInFirebase };
