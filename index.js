
//index.js file
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

// Connect to MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Replace with your MySQL password
    database: 'practicegovt'
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
 
// Connect to MySQL
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL');
});

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
            //added update commented below line of code not worked
            req.session.email = email;
            req.session.ac_id = ac_id;
            //printing ac_id in console
            console.log(ac_id);
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
                //addeed update to print ac_id in console
         
                          
                res.send(`Registration successful.${email}.`);

            });
        }
    });

});

app.post('/submitComplaint', (req, res) => {

    const { complaintType, name, aadharID, phoneNumber, complaintMessage, email} = req.body;
    // changed email to ac_id i had renamed email to ac_id and changed its column and datatype ALTER TABLE complaints CHANGE COLUMN email ac_id VARCHAR(255);
    const insertQuery = 'INSERT INTO complaints (complaintType, name, aadharID, phoneNumber, complaintMessage, ac_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertQuery, [complaintType, name, aadharID, phoneNumber, complaintMessage, email], (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Complaint submitted successfully');
        res.send('Complaint submitted successfully'); // You can redirect or render a different page here
    });
});

// Route to render dashboard page
app.get('/dashboard', (req, res) => {
    console.log(req.session.ac_id);
    //commented down thw line
   const email = req.session.email; // Retrieve email from session
    const ac_id = req.session.ac_id; //retrieve ac_id 
    if (!ac_id) {
        res.redirect('/'); // Redirect to login if session email is not set
    } else {
        // Render dashboard with email
        res.render('dashboard', { email });

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



// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy session on logout
    res.redirect('/'); // Redirect to login page
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

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

//admin panel; 06/05/2024 9:37

const correctPassword = 'admin123';

const authenticateadmin = (req, res, next) => {
    
    if (req.session.adminApproved) {
        
        next();
    } else {
        res.redirect('/adminpassword');
    }
};

app.get('/admin',authenticateadmin, (req , res)=>{
            res.render('admin.ejs');
});

app.get('/adminpassword', (req, res) => {
   
    res.render('adminpassword.ejs');

});

// app.post('/adminpassword', (req, res) => {
//     const { password } = req.body;

//     try {
//         if (password === correctPassword) {
//             req.session.adminApproved = true;
//             res.redirect('/admin');
//         } else {
//             res.status(401).send('Incorrect password');
//         }
//     } catch (error) {
//         // Log the error for debugging purposes
//         console.error('An error occurred:', error);
//         // Send an appropriate response to the client
//         res.status(500).send('Internal Server Error');
//     }
// });

//new admin password 
app.post('/adminpassword', (req, res) => {
    const { password } = req.body;

    try {
        // Query the admin password from the database
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
        // Log the error for debugging purposes
        console.error('An error occurred:', error);
        // Send an appropriate response to the client
        res.status(500).send('Internal Server Error');
    }
});


//ADMIN 11-05-2024
// APPROVED COMPLAINTS CODE 
//aproveed complaints

//get request for approve
app.get('/approve',authenticateadmin, (req, res) => {

    const selectQuery = 'SELECT * FROM complaints ';
    

    db.query(selectQuery, (err, results) => {
        if (err) {
            throw err;
        }
        
     
        res.render('apc', { complaints: results });
    });
});

//
//aproveed complaints
app.get('/apc/:referenceID',authenticateadmin,  (req, res) => {
    const referenceID = req.params.referenceID;

    // Get the row from complaints table based on referenceID
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

        // Insert the row into approvedcomplaints table
        db.query('INSERT INTO approvedcomplaints (complaintType, name, aadharID, phoneNumber, complaintMessage, referenceID, email, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [complaint.complaintType, complaint.name, complaint.aadharID, complaint.phoneNumber, complaint.complaintMessage, complaint.referenceID, complaint.email, complaint.created_at, complaint.status], (error, results) => {
            if (error) {
                console.error('Error approving complaint:', error);
                res.status(500).send('Error approving complaint');
                return;
            }

            // Update the status to "processing" in alldata table
            db.query('UPDATE alldata SET status = ? WHERE referenceID = ?', ['processing', referenceID], (error, results) => {
                if (error) {
                    console.error('Error updating status in alldata:', error);
                    res.status(500).send('Error updating status in alldata');
                    return;
                }

                // Delete the row from complaints table
                db.query('DELETE FROM complaints WHERE referenceID = ?', [referenceID], (error, results) => {
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
})

//officer 17/05/2024
// ??OFFICER


app.get('/of/:parameter',authenticateadmin, (req, res) => {
    const { parameter } = req.params;

   req.session.ct = parameter;

    db.query('SELECT * FROM approvedcomplaints WHERE complaintType = ?', [parameter], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server Error');
        }
        
        res.render('usercomplaints', { complaints: result });
    });
});

// mark as solved


app.get('/sc/:referenceID',authenticateadmin, (req, res) => {
    const referenceID = req.params.referenceID;


    // Get the row from complaints table based on referenceID
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

        // Insert the row into approvedcomplaints table
        db.query('INSERT INTO solved (complaintMessage, referenceID) VALUES (?, ?)', [complaint.complaintMessage, complaint.referenceID], (error, results) => {
            if (error) {
                console.error('Error approving complaint:', error);
                res.status(500).send('Error approving complaint');
                return;
            }

            // Update the status to "processing" in alldata table
            db.query('UPDATE alldata SET status = ? WHERE referenceID = ?', ['solved', referenceID], (error, results) => {
                if (error) {
                    console.error('Error updating status in alldata:', error);
                    res.status(500).send('Error updating status in alldata');
                    return;
                }

                // Delete the row from complaints table
                db.query('DELETE FROM approvedcomplaints WHERE referenceID = ?', [referenceID], (error, results) => {
                    if (error) {
                        console.error('Error removing complaint:', error);
                        res.status(500).send('Error removing complaint');
                        return;
                    }

                    res.redirect('http://localhost:3000/of/' + req.session.ct);

                });
            });
        });
    });
});