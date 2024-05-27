const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
const port = 3000;

// Connect to MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Replace with your MySQL password
    database: 'practicegovt'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1); // Terminate the application on database connection error
    }
    console.log('Connected to MySQL');
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.set('views', __dirname + '/views');

global.db = db;


// Routes
const routes = require('./routes'); // Assuming routes are defined in a separate file

app.get('/up', routes.index); // call for main index page
app.post('/up', routes.index); // call for signup post
app.get('/profile/:id', routes.profile); // to render user's profile

// Route to render login.ejs
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// Route to handle login form submission
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

// Route to handle registration form submission
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
                res.send('Registration successful.');
            });
        }
    });
});

// Route to handle complaint submission
app.post('/submitComplaint', (req, res) => {
    const { complaintType, name, aadharID, phoneNumber, complaintMessage, email } = req.body;
    const insertQuery = 'INSERT INTO complaints (complaintType, name, aadharID, phoneNumber, complaintMessage, ac_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertQuery, [complaintType, name, aadharID, phoneNumber, complaintMessage, email], (err, result) => {
        if (err) {
            throw err;
        }
        res.send('Complaint submitted successfully');
    });
});

// Route to render dashboard page
app.get('/dashboard', (req, res) => {
    const ac_id = req.session.ac_id;
    if (!ac_id) {
        res.redirect('/'); // Redirect to login if session email is not set
    } else {
        res.render('dashboard', { email: req.session.email });
    }
});

// Route to render form page
app.get('/form', (req, res) => {
    const email = req.session.email;
    if (!email) {
        res.redirect('/'); // Redirect to login if session email is not set
    } else {
        res.render('form', { email });
    }
});

// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy session on logout
    res.redirect('/'); // Redirect to login page
});

// Route to render user complaints
app.get('/uc', (req, res) => {
    const userEmail = req.session.email;
    const selectQuery = 'SELECT * FROM alldata WHERE email = ?';
    db.query(selectQuery, [userEmail], (err, results) => {
        if (err) {
            throw err;
        }
        res.render('yourcomplaints', { complaints: results });
    });
});

// Admin panel routes
const correctPassword = 'admin123';

const authenticateAdmin = (req, res, next) => {
    if (req.session.adminApproved) {
        next();
    } else {
        res.redirect('/adminpassword');
    }
};

app.get('/admin', authenticateAdmin, (req, res) => {
    res.render('admin.ejs');
});

app.get('/adminpassword', (req, res) => {
    res.render('adminpassword.ejs');
});

app.post('/adminpassword', (req, res) => {
    const { password } = req.body;
    try {
        db.query('SELECT admin_password FROM admin_credentials LIMIT 1', (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (results.length > 0 && password === results[0].admin_password) {
                req.session.adminApproved = true;
                res.redirect('/admin');
            } else {
                res.status(401).send('Incorrect password');
            }
        });
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Admin approval routes
app.get('/approve', authenticateAdmin, (req, res) => {
    const selectQuery = 'SELECT * FROM complaints';
    db.query(selectQuery, (err, results) => {
        if (err) {
            throw err;
        }
        res.render('apc', { complaints: results });
    });
});

app.get('/apc/:referenceID', authenticateAdmin, (req, res) => {
    const referenceID = req.params.referenceID;
    db.query('SELECT * FROM complaints WHERE referenceID = ?', [referenceID], (error, results) => {
        if (error) {
            console.error('Error fetching complaint:', error);
            res.status(500).send('Error fetching complaint');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Complaint not found');
            return;
        }
        const complaint = results[0];
        db.query('INSERT INTO approvedcomplaints (complaintType, name, aadharID, phoneNumber, complaintMessage, referenceID, email, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [complaint.complaintType, complaint.name, complaint.aadharID, complaint.phoneNumber, complaint.complaintMessage, complaint.referenceID, complaint.email, complaint.created_at, complaint.status], (error) => {
            if (error) {
                console.error('Error approving complaint:', error);
                res.status(500).send('Error approving complaint');
                return;
            }
            db.query('UPDATE alldata SET status = ? WHERE referenceID = ?', ['processing', referenceID], (error) => {
                if (error) {
                    console.error('Error updating status in alldata:', error);
                    res.status(500).send('Error updating status in alldata');
                    return;
                }
                db.query('DELETE FROM complaints WHERE referenceID = ?', [referenceID], (error) => {
                    if (error) {
                        console.error('Error removing complaint:', error);
                        res.status(500).send('Error removing complaint');
                        return;
                    }
                    res.redirect('/approve');
                });
            });
        });
    });
});

// Officer routes
app.get('/of/:parameter', authenticateAdmin, (req, res) => {
    const parameter = req.params.parameter;
    req.session.ct = parameter;
    db.query('SELECT * FROM approvedcomplaints WHERE complaintType = ?', [parameter], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }
        res.render('usercomplaints', { complaints: result });
    });
});

app.get('/sc/:referenceID', authenticateAdmin, (req, res) => {
    const referenceID = req.params.referenceID;
    db.query('SELECT * FROM approvedcomplaints WHERE referenceID = ?', [referenceID], (error, results) => {
        if (error) {
            console.error('Error fetching complaint:', error);
            res.status(500).send('Error fetching complaint');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Complaint not found');
            return;
        }
        const complaint = results[0];
        db.query('INSERT INTO solved (complaintMessage, referenceID) VALUES (?, ?)', [complaint.complaintMessage, complaint.referenceID], (error) => {
            if (error) {
                console.error('Error inserting into solved:', error);
                res.status(500).send('Error inserting into solved');
                return;
            }
            db.query('UPDATE alldata SET status = ? WHERE referenceID = ?', ['solved', referenceID], (error) => {
                if (error) {
                    console.error('Error updating status in alldata:', error);
                    res.status(500).send('Error updating status in alldata');
                    return;
                }
                db.query('DELETE FROM approvedcomplaints WHERE referenceID = ?', [referenceID], (error) => {
                    if (error) {
                        console.error('Error removing complaint:', error);
                        res.status(500).send('Error removing complaint');
                        return;
                    }
                    res.redirect(`/of/${req.session.ct}`);
                });
            });
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
