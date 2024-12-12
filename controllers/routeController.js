const { verifyEmailInFirebase } = require('../services/firebaseService');
const { saveAddressHistory } = require('../services/mysqlService');
const { optimizeRoute } = require('../services/tensorflowService');

const optimizeRouteHandler = async (request, h) => {
    const { email, addresses } = request.payload;

    if (!email || !addresses || !Array.isArray(addresses)) {
        return h.response({ error: 'Invalid input. Provide email and an array of addresses.' }).code(400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return h.response({ error: 'Invalid email format' }).code(400);
    }

    try {
        await verifyEmailInFirebase(email);
        const result = await optimizeRoute(email, addresses);

        for (const address of addresses) {
            await saveAddressHistory(email, address);
        }

        return result;
    } catch (error) {
        console.error('Error optimizing route:', error.message);
        return h.response({ error: 'Failed to optimize route', details: error.message }).code(500);
    }
};

module.exports = { optimizeRouteHandler };
