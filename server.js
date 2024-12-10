const Hapi = require('@hapi/hapi');
const tf = require('@tensorflow/tfjs-node'); 
const geolib = require('geolib'); 
require('dotenv').config();

let model; 

const loadModel = async () => {
    model = await tf.loadLayersModel('https://storage.googleapis.com/routerush-bucket/ml-model/model.json'); 
    console.log('Model loaded successfully');
};

const axios = require('axios');

const geocodeAddress = async (address) => {
    const apiKey = process.env.GEOCODING_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url); // Panggil API
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


// Fungsi untuk memproses input dan mengoptimalkan rute
const optimizeRoute = async (addresses) => {
    // 1. (Opsional) Ubah alamat menjadi koordinat jika model memerlukan koordinat
    const coordinates = await Promise.all(
        addresses.map(async (address) => await geocodeAddress(address))
    );

    // 2. Konversi koordinat ke tensor untuk model
    const inputTensor = tf.tensor2d(coordinates.map(coord => [coord.latitude, coord.longitude]));

    // 3. Lakukan prediksi menggunakan model
    const prediction = model.predict(inputTensor);

    // 4. Ambil hasil prediksi dan tentukan urutan optimal
    const optimizedIndices = prediction.arraySync().map((val, idx) => ({ idx, val }))
        .sort((a, b) => a.val - b.val)
        .map(item => item.idx);

    // 5. Susun ulang alamat berdasarkan urutan optimal
    return optimizedIndices.map(idx => addresses[idx]);
};

// Inisialisasi server
const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
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

            const optimizedRoute = await optimizeRoute(addresses);
            return { optimizedRoute };
        },
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};


loadModel().then(init).catch((err) => {
    console.error('Error starting server:', err);
});
