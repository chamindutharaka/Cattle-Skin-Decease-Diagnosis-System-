# Backend

This directory contains the Node.js and Express backend for the Cattle Monitoring Dashboard.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file in this directory and add the following variables:
    ```
    DATABASE_URL="file:./dev.db"
    JWT_SECRET="your_jwt_secret"
    ```
    Replace `"your_jwt_secret"` with a long, random string.

3.  **Run Database Migrations:**
    This will create the SQLite database file and the necessary tables.
    ```bash
    npx prisma migrate dev
    ```

## Running the Server

-   **Development Mode:**
    This will start the server with `nodemon`, which automatically restarts the server when files are changed.
    ```bash
    npm run dev
    ```
    The server will be available at `http://localhost:3001`.

-   **Production Mode:**
    ```bash
    npm start
    ```

## API Endpoints

-   `POST /api/auth/register`: Register a new user.
-   `POST /api/auth/login`: Login a user and get a JWT token.
-   `POST /api/data`: Submit sensor data from an IoT device.
-   `GET /api/cattle`: Get a list of all cattle.
-   `POST /api/cattle`: Add a new cattle.
-   `GET /api/cattle/:id`: Get details for a specific cattle.
-   `GET /api/cattle/:id/history`: Get sensor history for a specific cattle.
