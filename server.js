const Hapi = require('@hapi/hapi');
const tf = require('@tensorflow/tfjs-node');
const geolib = require('geolib');
const axios = require('axios');
const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
require('dotenv').config();

let model;
let dbConnection;

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(require('./firebase-service-account.json')),
});

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

// Fungsi untuk menghubungkan ke database MySQL
const connectToDatabase = async () => {
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log('Connected to MySQL database');
    } catch (error) {
        console.error('Error connecting to MySQL database:', error.message);
        throw error;
    }
};

// Fungsi untuk menyimpan riwayat alamat ke database
const saveAddressHistory = async (email, address) => {
    try {
        console.log(`Saving to DB - Email: ${email}, Address: ${address}`);

        // Format timestamp ke format MySQL (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        await dbConnection.execute(
            'INSERT INTO address_history (email, address, created_at) VALUES (?, ?, ?)',
            [email, address, timestamp]
        );
        console.log(`Address "${address}" saved for user "${email}"`);
    } catch (error) {
        console.error('Error saving address history:', error.message);
        throw error;
    }
};



const verifyEmailInFirebase = async (email) => {
    try {
        // Ambil pengguna dari Firebase Authentication berdasarkan email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`User "${userRecord.email}" is verified in Firebase`);
        return userRecord;
    } catch (error) {
        console.error('Error verifying email in Firebase:', error.message);
        throw new Error('Email not found in Firebase');
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
const optimizeRoute = async (email, addresses) => {
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

// Fungsi untuk mendapatkan riwayat alamat berdasarkan email dari database
const getAddressHistoryByEmail = async (email) => {
    try {
        const [rows] = await dbConnection.execute(
            'SELECT address FROM address_history WHERE email = ? ORDER BY created_at DESC',
            [email]
        );
        console.log(`Fetched ${rows.length} addresses for email "${email}"`);
        return rows.map(row => row.address); // Hanya ambil kolom address
    } catch (error) {
        console.error('Error fetching address history:', error.message);
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

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    
    // Endpoint untuk optimasi rute
    server.route({
        method: 'POST',
        path: '/optimize-route',
        handler: async (request, h) => {
            const { email, addresses } = request.payload;
            console.log(`Payload received: email=${email}, addresses=${JSON.stringify(addresses)}`);
    
            // Validasi input
            if (!email || !addresses || !Array.isArray(addresses)) {
                return h.response({ error: 'Invalid input. Provide email and an array of addresses.' }).code(400);
            }
    
            // Validasi format email
            if (!isValidEmail(email)) {
                return h.response({ error: 'Invalid email format' }).code(400);
            }
    
            try {
                // Verifikasi email di Firebase
                const userRecord = await verifyEmailInFirebase(email);
    
                // Jalankan optimasi rute
                const result = await optimizeRoute(email, addresses);
    
                // Simpan riwayat alamat pengguna ke database
                for (const address of addresses) {
                    await saveAddressHistory(email, address);
                }
    
                return result;
            } catch (error) {
                console.error('Error in /optimize-route handler:', error.message);
                return h.response({ error: 'Failed to optimize route', details: error.message }).code(500);
            }
        },
    });
    
    // Endpoint untuk mendapatkan riwayat alamat berdasarkan email
    server.route({
        method: 'GET',
        path: '/address-history',
        handler: async (request, h) => {
            const email = request.query.email;
            console.log(`Fetching address history for email: ${email}`);

            // Validasi email
            if (!email || !isValidEmail(email)) {
                return h.response({ error: 'Invalid email provided' }).code(400);
            }

            try {
                // Ambil riwayat alamat dari database
                const history = await getAddressHistoryByEmail(email);

                // Jika tidak ada riwayat ditemukan
                if (history.length === 0) {
                    return h.response({ message: `No history found for email: ${email}` }).code(404);
                }

                return { email, addresses: history }; // Tampilkan hanya alamat
            } catch (error) {
                console.error('Error in /address-history handler:', error.message);
                return h.response({ error: 'Failed to fetch address history', details: error.message }).code(500);
            }
        },
    });

    await connectToDatabase();
    await server.start();
    console.log('Server running on %s', server.info.uri);
};

loadModel().then(init).catch((err) => {
    console.error('Error starting server:', err);
});