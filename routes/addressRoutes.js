const { getAddressHistory } = require('../controllers/addressController');

const addressRoutes = [
    {
        method: 'GET',
        path: '/address-history',
        handler: getAddressHistory,
    },
];

module.exports = addressRoutes;
