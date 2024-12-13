# RouteRush Machine Learning Backend API

This repository contains the API implementation for machine learning models that have been converted into tensorflow.js models.

## Project Description

The Routerush ML Backend is built by using Node.js and HAPI Framework. It provides endpoints for oprimization route,store address to dataabase and get history from database, we also use MySQL as data storage.

## Getting Started

To get started with Routerush ML Backend, you can follow these steps :

1. make sure you have installed node.js via Node Version Manager(NVM)
2. Clone Repository `git clone https://github.com/Routerushorg/Backend-ml.git`
3. navigate to the resulting clone folder `cd path/to/your/project`
4. run `npm init --y`
5. Install Dependencies `npm install @hapi/hapi@^21.3.12 @tensorflow/tfjs@^4.22.0 @tensorflow/tfjs-node@^4.22.0 axios@^1.7.9 dotenv@^16.4.7 firebase-admin@^13.0.1 geolib@^3.3.4 mysql2@^3.11.5`
6. Set up .env Variables
- `PORT`: The port on which the server will listen.
- `GEOCODE_API_KEY`: THE API From Google Maps,
- `DB_USER`: The username for the MySQL database.
- `DB_PASSWORD`: The password for the MySQL database.
- `DB_HOST`: The host address of the MySQL database.
- `DB_NAME`: The name of the MySQL database.
- `FIREBASE_SERVICE_ACCOUNT_BASE64`: JSON file of the Firebase Service Account converted to a Base64 string, you can run this command to convert it `cat firebase-service-account.json | base64 -w 0`
6. Run `npm run start`
