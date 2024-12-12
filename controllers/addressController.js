const { getAddressHistoryByEmail } = require('../services/mysqlService');

const getAddressHistory = async (request, h) => {
    const email = request.query.email;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return h.response({ error: 'Invalid email provided' }).code(400);
    }

    try {
        const history = await getAddressHistoryByEmail(email);
        if (history.length === 0) {
            return h.response({ message: `No history found for email: ${email}` }).code(404);
        }
        return { email, addresses: history };
    } catch (error) {
        console.error('Error fetching address history:', error.message);
        return h.response({ error: 'Failed to fetch address history', details: error.message }).code(500);
    }
};

module.exports = { getAddressHistory };
