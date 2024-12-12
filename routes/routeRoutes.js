const { optimizeRouteHandler } = require('../controllers/routeController');

const routeRoutes = [
    {
        method: 'POST',
        path: '/optimize-route',
        handler: optimizeRouteHandler,
    },
];

module.exports = routeRoutes;
