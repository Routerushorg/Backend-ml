const axios = require('axios');

/**
 * Fungsi untuk mengonversi alamat menjadi koordinat menggunakan API Geocoding Google Maps
 * @param {string} address - Alamat yang ingin dikonversi ke koordinat
 * @returns {Promise<Object>} - Objek koordinat { latitude, longitude }
 * @throws {Error} - Jika geocoding gagal
 */
const geocodeAddress = async (address) => {
    const apiKey = process.env.GEOCODING_API_KEY; // Pastikan key ada di .env file
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

module.exports = {
    geocodeAddress,
};
