const axios = require('axios');

/** 
 * @param {string} address
 * @returns {Promise<Object>}
 * @throws {Error}
 */
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

module.exports = {
    geocodeAddress,
};
