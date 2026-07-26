require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { initSocket } = require('./sockets');
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const sosRoutes = require('./routes/sosRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

initSocket(server);

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/location', locationRoutes);
app.use('/sos', sosRoutes);
app.use('/contacts', contactRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

server.listen(PORT, () => {
  console.log(`SafeHer backend running on port ${PORT}`);
});

module.exports = app;
