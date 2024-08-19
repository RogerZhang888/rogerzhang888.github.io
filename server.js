const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'mydatabase.db');
const db = new sqlite3.Database(dbPath);

// Initialize database and create table if it does not exist
db.serialize(() => {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'", (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    if (!row) {
      db.run("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, content TEXT)");
    }
  });
});

// Get all posts
app.get('/api/posts', (req, res) => {
  db.all("SELECT * FROM posts", (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

// Get a single post by ID
app.get('/api/posts/:id', (req, res) => {
  const postId = req.params.id;
  db.get("SELECT * FROM posts WHERE id = ?", [postId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Post not found');
    } else {
      res.json(row);
    }
  });
});

// Create a new post
app.post('/api/posts', (req, res) => {
  const { title, date, content } = req.body;
  db.run("INSERT INTO posts (title, date, content) VALUES (?, ?, ?)", [title, date, content], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json({ id: this.lastID, title, date, content });
    }
  });
});

// Update a post
app.put('/api/posts/:id', (req, res) => {
  const { title, date, content } = req.body;
  const postId = req.params.id;
  db.run("UPDATE posts SET title = ?, date = ?, content = ? WHERE id = ?", [title, date, content, postId], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json({ id: postId, title, date, content });
    }
  });
});

// Route to delete a post
app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id;

  db.run("DELETE FROM posts WHERE id = ?", [postId], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      // Resequence the IDs
      db.serialize(() => {
        db.run("UPDATE posts SET id = id - 1 WHERE id > ?", [postId], function(err) {
          if (err) {
            res.status(500).send(err.message);
          } else {
            res.status(204).send();
          }
        });
        
        db.run("UPDATE SQLITE_SEQUENCE SET seq = (SELECT MAX(id) FROM posts) WHERE name='posts'", function(err) {
          if (err) {
            console.error(err.message);
          }
        });
      });
    }
  });
});


// Handle form submission for adding new posts
app.post('/submit-post', (req, res) => {
  const { title, date, content } = req.body;
  db.run("INSERT INTO posts (title, date, content) VALUES (?, ?, ?)", [title, date, content], function(err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.redirect('/blog.html');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
