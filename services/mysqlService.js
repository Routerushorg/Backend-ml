const mysql = require('mysql2/promise');
let dbConnection;

const connectToDatabase = async () => {
    if (dbConnection) return dbConnection;
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log('Connected to MySQL database');
        return dbConnection;
    } catch (error) {
        console.error('Error connecting to MySQL database:', error.message);
        throw error;
    }
};

const saveAddressHistory = async (email, address) => {
    try {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        await dbConnection.execute(
            'INSERT INTO address_history (email, address, created_at) VALUES (?, ?, ?)',
            [email, address, timestamp]
        );
    } catch (error) {
        console.error('Error saving address history:', error.message);
        throw error;
    }
};

const getAddressHistoryByEmail = async (email) => {
    try {
        const [rows] = await dbConnection.execute(
            'SELECT address FROM address_history WHERE email = ? ORDER BY created_at DESC',
            [email]
        );
        return rows.map(row => row.address);
    } catch (error) {
        console.error('Error fetching address history:', error.message);
        throw error;
    }
};

module.exports = { connectToDatabase, saveAddressHistory, getAddressHistoryByEmail };
