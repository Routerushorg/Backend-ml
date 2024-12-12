const Hapi = require('@hapi/hapi');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./services/mysqlService');
const { loadModel } = require('./services/tensorflowService');
const addressRoutes = require('./routes/addressRoutes');
const routeRoutes = require('./routes/routeRoutes');

dotenv.config();

const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
    });

    // Tambahkan semua route
    server.route([...addressRoutes, ...routeRoutes]);

    // Hubungkan ke database
    await connectToDatabase();

    // Muat model TensorFlow
    await loadModel();

    await server.start();
    console.log(`Server running on ${server.info.uri}`);
};

module.exports = init;
