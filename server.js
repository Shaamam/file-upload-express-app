const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');

// Initialize Express app
const app = express();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'node-server',
  password: 'admin',
  port: 5432,
});

// Create a table for storing PDFs (run this once)
const createTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdfs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        data BYTEA
      )
    `);
  } finally {
    client.release();
  }
};

createTable();

// Route to handle PDF upload
app.post('/upload', upload.single('pdf'), async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const client = await pool.connect();
  try {
    const fileData = fs.readFileSync(file.path);
    const result = await client.query(
      'INSERT INTO pdfs (name, data) VALUES ($1, $2) RETURNING id',
      [file.originalname, fileData]
    );
    res.status(200).send(`File uploaded with ID: ${result.rows[0].id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving file.');
  } finally {
    client.release();
    fs.unlinkSync(file.path); // Clean up the temp file
  }
});

//download pdf

app.get('/download/:id', async (req, res) => {
    const { id } = req.params;
  
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT name, data FROM pdfs WHERE id = $1', [id]);
  
      if (result.rows.length === 0) {
        return res.status(404).send('File not found.');
      }
  
      const { name, data } = result.rows[0];
  
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  
      // Send the PDF file
      res.send(data);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving file.');
    } finally {
      client.release();
    }
  });

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
