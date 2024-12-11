const express = require('express');
const multer = require('multer');
const mysql = require('mysql');
const fs = require('fs');

// Initialize Express app
const app = express();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure MySQL connection
//Update with local mysql connection credentials
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'your_db_user',
  password: 'your_db_password',
  database: 'your_db_name',
});

// Connect to MySQL
connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database.');

  // Create table if not exists
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS pdfs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      data LONGBLOB NOT NULL
    )
  `;
  connection.query(createTableQuery, (err) => {
    if (err) throw err;
    console.log('PDFs table is ready.');
  });
});

// Endpoint to upload PDF
app.post('/upload', upload.single('pdf'), (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const fileData = fs.readFileSync(file.path);

  const query = 'INSERT INTO pdfs (name, data) VALUES (?, ?)';
  connection.query(query, [file.originalname, fileData], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving file.');
    }

    res.status(200).send(`File uploaded with ID: ${result.insertId}`);
    fs.unlinkSync(file.path); // Clean up the temp file
  });
});

// Endpoint to download PDF by ID
app.get('/download/:id', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT name, data FROM pdfs WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving file.');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found.');
    }

    const { name, data } = results[0];

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);

    // Send the PDF file
    res.send(data);
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start the app with `node app.js`