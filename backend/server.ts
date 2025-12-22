import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import mongoose from 'mongoose';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(express.json()); // Enable JSON body parser

// Define Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error(err));

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});