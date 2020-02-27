// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('./lib/client');
// Initiate database connection
client.connect();

// Auth
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const authRoutes = createAuthRoutes({
    selectUser(email) {
        return client.query(`
            SELECT id, email, hash 
            FROM users
            WHERE email = $1;
        `,
        [email]
        ).then(result => result.rows[0]);
    },
    insertUser(user, hash) {
        console.log(user);
        return client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email;
        `,
        [user.email, hash]
        ).then(result => result.rows[0]);
    }
});

// Application Setup
const app = express();
const PORT = process.env.PORT;
app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data
app.use(express.urlencoded({ extended: true }));

// Set up authentication routes
app.use('/api/auth', authRoutes);
app.use('/api', ensureAuth);

// API Routes
app.get('/api/test', (req, res) => {
    res.json({
        message: `the user's id is ${req.userId}`
    });
});

// *** TODOS ***
app.get('/api/todos', async(req, res) => {

    try {
        const result = await client.query(`
            SELECT * FROM todos
        `);

        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

app.post('/api/todos', async(req, res) => {
    const todo = req.body;

    try {
        const result = await client.query(`
            INSERT INTO todos (task, complete)
            VALUES ('${todo.task}', false)
            RETURNING *
        `,
        [todo.task, todo.complete]);

        res.json(result.rows[0]);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

app.put('/api/todos/:id', async(req, res) => {
    const id = req.params.id;
    const todo = req.body;

    try {
        const result = await client.query(`
            UPDATE todos
            SET complete=${req.body.complete}
            WHERE id=${req.params.id}
        `, 
        [todo.complete, id]);

        res.json(result.rows[0]);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

app.delete('/api/todos/:id', async(req, res) => {
    // get the id that was passed in the route:

    try {
        const result = await client.query(`
            DELETE FROM todos
                WHERE id=$1
        `, 
        [req.params.id]);

        res.json(result.rows[0]);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log('server running on PORT', PORT);
});