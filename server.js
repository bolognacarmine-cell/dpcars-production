const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));

require('./cloudinary');

app.use('/api/veicoli', require('./routes/veicoli'));
app.get('/api/test', (req, res) => res.json({message: 'DP Cars Backend + Cloudinary'}));

// FIX 404 Express v5
app.use((req, res) => res.status(404).json({error: 'Non trovato'}));

app.listen(PORT, () => {
  console.log(`🚀 DP Cars Backend su http://localhost:${PORT}`);
});
