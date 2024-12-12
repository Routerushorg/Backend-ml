const Hapi = require('@hapi/hapi');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./services/mysqlService');
const { loadModel } = require('./services/tensorflowService');
const addressRoutes = require('./routes/addressRoutes');
const routeRoutes = require('./routes/routeRoutes');
const { initializeFirebase } = require('./services/firebaseService');

dotenv.config();

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
    });

    initializeFirebase();

    server.route([...addressRoutes, ...routeRoutes]);

    await connectToDatabase();

    await loadModel();

    await server.start();
    console.log(`Server running on ${server.info.uri}`);
};

module.exports = init;
