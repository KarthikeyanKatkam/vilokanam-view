const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const streams = [
  {
    id: '1',
    title: 'Learning Rust Programming',
    creator: 'CodeMaster',
    viewerCount: 1240,
    category: 'Programming',
    isLive: true,
    thumbnail: null
  },
  {
    id: '2',
    title: 'Cooking Italian Pasta',
    creator: 'ChefMaria',
    viewerCount: 856,
    category: 'Cooking',
    isLive: true,
    thumbnail: null
  },
  {
    id: '3',
    title: 'Gaming Adventure - New World',
    creator: 'GameHero',
    viewerCount: 3240,
    category: 'Gaming',
    isLive: true,
    thumbnail: null
  },
  {
    id: '4',
    title: 'Music Production Session',
    creator: 'DJBeats',
    viewerCount: 560,
    category: 'Music',
    isLive: true,
    thumbnail: null
  }
];

// Routes
app.get('/api/streams', (req, res) => {
  res.json(streams);
});

app.get('/api/streams/:id', (req, res) => {
  const stream = streams.find(s => s.id === req.params.id);
  if (stream) {
    res.json(stream);
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});