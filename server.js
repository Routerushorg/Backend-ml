const init = require('./app');

init().catch((err) => {
    console.error('Error starting server:', err);
});