// bootstrap.ts MUST be first — loads .env before any other module reads process.env
import './bootstrap';

import app from './app';
import connectDB from './config/db';
import './config/cloudinary'; // Initialize cloudinary on start


const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect DB", err);
    process.exit(1);
  });
