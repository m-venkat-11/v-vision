import express from 'express';
import cors from 'cors';
import { executeRoute } from './routes/execute.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', executeRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorType: 'server'
  });
});

app.listen(PORT, () => {
  console.log(`VisualCode backend running on http://localhost:${PORT}`);
});
