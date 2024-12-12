const tf = require('@tensorflow/tfjs-node');
const geolib = require('geolib');
const { geocodeAddress } = require('./geocodeService');
let model;

const loadModel = async () => {
    try {
        model = await tf.loadGraphModel('https://storage.googleapis.com/ml-model-rr/model-prod/model.json');
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error.message);
        throw error;
    }
};

const optimizeRoute = async (email, addresses) => {
    try {
        const coordinates = await Promise.all(
            addresses.map(async (address) => {
                const coords = await geocodeAddress(address);
                return { ...coords, address };
            })
        );

        const startPoint = coordinates[0];

        const distances = coordinates.slice(1).map((coord) => ({
            address: coord.address,
            distance: geolib.getDistance(
                { latitude: startPoint.latitude, longitude: startPoint.longitude },
                { latitude: coord.latitude, longitude: coord.longitude }
            ),
        }));

        const inputTensor = tf.tensor2d(coordinates.map(coord => [coord.latitude, coord.longitude, 0]));
        const prediction = model.predict(inputTensor);
        const predictionArray = prediction.arraySync();

        const sorted = distances.sort((a, b) => a.distance - b.distance);
        return [startPoint.address, ...sorted.map(item => item.address)];
    } catch (error) {
        throw error;
    }
};

module.exports = { loadModel, optimizeRoute };
