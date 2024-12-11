const Hapi = require('@hapi/hapi');
const tf = require('@tensorflow/tfjs-node');
const geolib = require('geolib');
const axios = require('axios');
require('dotenv').config();

let model;

// Fungsi untuk memuat model TensorFlow dari URL
const loadModel = async () => {
    try {
        model = await tf.loadGraphModel('https://storage.googleapis.com/ml-model-rr/model-prod/model.json');
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error.message);
        throw error;
    }
};

// Fungsi untuk mengonversi alamat menjadi koordinat menggunakan API Geocoding Google Maps
const geocodeAddress = async (address) => {
    const apiKey = process.env.GEOCODING_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.status === 'OK') {
            const location = data.results[0].geometry.location;
            return {
                latitude: location.lat,
                longitude: location.lng,
            };
        } else {
            throw new Error(`Geocoding failed: ${data.status}`);
        }
    } catch (error) {
        console.error('Error in geocoding:', error.message);
        throw error;
    }
};

// Fungsi untuk memproses input dan mendapatkan prediksi model
const optimizeRoute = async (addresses) => {
    try {
        console.log('Starting optimization for addresses:', addresses);

        const coordinates = await Promise.all(
            addresses.map(async (address) => {
                const coords = await geocodeAddress(address);
                console.log(`Coordinates for ${address}:`, coords);
                return { ...coords, address };
            })
        );

        const startPoint = coordinates[0];
        console.log('Start Point:', startPoint);

        const distances = coordinates.slice(1).map((coord, idx) => ({
            index: idx + 1,
            address: coord.address,
            distance: geolib.getDistance(
                { latitude: startPoint.latitude, longitude: startPoint.longitude },
                { latitude: coord.latitude, longitude: coord.longitude }
            ),
        }));

        console.log('Sorted Distances:', distances);

        const inputTensor = tf.tensor2d(coordinates.map(coord => [coord.latitude, coord.longitude, 0]));
        console.log('Input Tensor Shape:', inputTensor.shape);

        const prediction = model.predict(inputTensor);
        const predictionArray = prediction.arraySync();
        console.log('Prediction Array:', predictionArray);

        distances.forEach((dist, idx) => {
            dist.prediction = predictionArray[idx + 1][0];
        });

        const finalSorted = distances.sort((a, b) => a.distance - b.distance);
        console.log('Final Sorted:', finalSorted);

        const optimizedRoute = [startPoint.address, ...finalSorted.map(item => item.address)];
        console.log('Optimized Route:', optimizedRoute);

        return { optimizedRoute };
    } catch (error) {
        console.error('Error in optimizeRoute:', error.message);
        throw error;
    }
};

// Inisialisasi server
const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: '0.0.0.0',
    });

    // Endpoint untuk memeriksa status server
    server.route({
        method: 'GET',
        path: '/',
        handler: () => {
            return { message: 'API is running!' };
        },
    });

    // Endpoint untuk optimasi rute
    server.route({
        method: 'POST',
        path: '/optimize-route',
        handler: async (request, h) => {
            const { addresses } = request.payload;
            if (!addresses || !Array.isArray(addresses)) {
                return h.response({ error: 'Invalid input. Provide an array of addresses.' }).code(400);
            }

            try {
                const result = await optimizeRoute(addresses);
                return result;
            } catch (error) {
                console.error('Error in /optimize-route handler:', error.message);
                return h.response({ error: 'Failed to optimize route', details: error.message }).code(500);
            }
        },
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

loadModel().then(init).catch((err) => {
    console.error('Error starting server:', err);
});
