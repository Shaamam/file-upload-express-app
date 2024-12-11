const express = require('express');
const multer = require('multer');
const mysql = require('mysql');
const fs = require('fs');

// Initialize Express app
const app = express();

// Configure multer for handling multiple file uploads
const upload = multer({ dest: 'uploads/' });

// Configure MySQL connection
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
    CREATE TABLE IF NOT EXISTS pdf_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name1 VARCHAR(255),
      data1 LONGBLOB,
      name2 VARCHAR(255),
      data2 LONGBLOB
    )
  `;
  connection.query(createTableQuery, (err) => {
    if (err) throw err;
    console.log('PDF records table is ready.');
  });
});

// Endpoint to upload two PDFs as one record
app.post('/upload', upload.array('pdfs', 2), (req, res) => {
  const files = req.files;
  if (!files || files.length !== 2) {
    return res.status(400).send('Please upload exactly two files.');
  }

  const fileData1 = fs.readFileSync(files[0].path);
  const fileData2 = fs.readFileSync(files[1].path);

  const query = 'INSERT INTO pdf_records (name1, data1, name2, data2) VALUES (?, ?, ?, ?)';
  connection.query(query, [files[0].originalname, fileData1, files[1].originalname, fileData2], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving files.');
    }

    res.status(200).send({ message: 'Files uploaded successfully', recordId: result.insertId });

    // Clean up the temp files
    fs.unlinkSync(files[0].path);
    fs.unlinkSync(files[1].path);
  });
});

// Endpoint to download the first PDF by record ID
app.get('/download/:id/pdf1', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT name1, data1 FROM pdf_records WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving file.');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found.');
    }

    const { name1, data1 } = results[0];

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${name1}"`);

    // Send the PDF file
    res.send(data1);
  });
});

// Endpoint to download the second PDF by record ID
app.get('/download/:id/pdf2', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT name2, data2 FROM pdf_records WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving file.');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found.');
    }

    const { name2, data2 } = results[0];

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${name2}"`);

    // Send the PDF file
    res.send(data2);
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
