const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'practicegovt'
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL');
});

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const selectQuery = 'SELECT * FROM logins WHERE email = ? AND password = ?';
    db.query(selectQuery, [email, password], (err, result) => {
        if (err) {
            throw err;
        }
        if (result.length === 0) {
            res.send('Invalid email or password');
        } else {
            const ac_id = result[0].ac_id;
            req.session.email = email;
            req.session.ac_id = ac_id;
            res.redirect('/dashboard');
        }
    });
});

app.post('/register', (req, res) => {
    const { email, password } = req.body;
    const selectQuery = 'SELECT * FROM logins WHERE email = ?';
    const insertQuery = 'INSERT INTO logins (email, password) VALUES (?, ?)';
    db.query(selectQuery, [email], (err, result) => {
        if (err) {
            throw err;
        }
        if (result.length > 0) {
            res.send('User already exists');
        } else {
            db.query(insertQuery, [email, password], (err, result) => {
                if (err) {
                    throw err;
                }
                console.log('User registered successfully');
                          
                res.send(`Registration successful.${email}.`);

            });
        }
    });

});

app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy session on logout
    res.redirect('/'); // Redirect to login page
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.get('/dashboard', (req, res) => {
    const email = req.session.email; // Retrieve email from session
    const ac_id = req.session.ac_id; //retrieve ac_id 
    if (!email) {
        res.redirect('/'); // Redirect to login if session email is not set
    } else {
        // Render dashboard with email
        res.render('dashboard', { email,ac_id });
    }
});

app.get('/form', (req, res) => {
    const email = req.session.email; // Retrieve email from session
    if (!email) {
        res.redirect('/'); // Redirect to login if session email is not set
    } else {
        // Render dashboard with email
        res.render('form', { email });
    }
});

app.post('/submitComplaint', (req, res) => {

    const { complaintType, name, aadharID, phoneNumber, complaintMessage, email} = req.body;

    const insertQuery = 'INSERT INTO complaints (complaintType, name, aadharID, phoneNumber, complaintMessage, email) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertQuery, [complaintType, name, aadharID, phoneNumber, complaintMessage, email], (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Complaint submitted successfully');
        res.send('Complaint submitted successfully'); // You can redirect or render a different page here
    });
});

app.get('/uc', (req, res) => {
    const userEmail = req.session.email; 
  
    const selectQuery = 'SELECT * FROM complaints WHERE email = ?';
    

    db.query(selectQuery, [userEmail], (err, results) => {
        if (err) {
            throw err;
        }
        
     
        res.render('yourcomplaints', { complaints: results });
    });
});