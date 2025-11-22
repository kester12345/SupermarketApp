// controllers/UserController.js
const db = require('../db');

const UserController = {
  // ---------- PUBLIC AUTH ----------
  register: (req, res) => {
    const { username, email, password, address, contact } = req.body;

    if (!username || !email || !password || !address || !contact) {
      req.flash('error', 'All fields are required.');
      req.flash('formData', req.body);
      return res.redirect('/register');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long.');
      req.flash('formData', req.body);
      return res.redirect('/register');
    }

    const role = 'user'; // default role
    const sql = `
      INSERT INTO users (username, email, password, address, contact, role)
      VALUES (?, ?, SHA1(?), ?, ?, ?)
    `;
    db.query(sql, [username, email, password, address, contact, role], (err) => {
      if (err) {
        console.error('Error registering user:', err);
        req.flash('error', 'Registration failed.');
        return res.redirect('/register');
      }
      req.flash('success', 'Registration successful! Please log in.');
      res.redirect('/login');
    });
  },

  login: (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
      if (err) {
        console.error('Login error:', err);
        req.flash('error', 'Something went wrong.');
        return res.redirect('/login');
      }

      if (results.length > 0) {
        req.session.user = results[0];
        return results[0].role === 'admin'
          ? res.redirect('/inventory')
          : res.redirect('/shopping');
      }

      req.flash('error', 'Invalid email or password.');
      res.redirect('/login');
    });
  },

  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  },

  // ---------- ADMIN USER MANAGEMENT ----------
  listUser: (req, res) => {
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).send('Error retrieving users');
      }
      res.render('listUser', { users, user: req.session.user });
    });
  },

  // Create user (Admin) — includes all required columns
  addUser: (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/addUser');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long.');
      return res.redirect('/addUser');
    }

    const sql = `
      INSERT INTO users (username, email, password, address, contact, role)
      VALUES (?, ?, SHA1(?), ?, ?, ?)
    `;
    db.query(sql, [username, email, password, address, contact, role], (err) => {
      if (err) {
        console.error('Error adding user:', err);
        req.flash('error', 'Error adding user.');
        return res.redirect('/addUser');
      }
      req.flash('success', 'User added successfully.');
      res.redirect('/listUsers');
    });
  },

  // Load user for update form (Admin)
  getUserById: (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error('Error fetching user:', err);
        req.flash('error', 'Error retrieving user');
        return res.redirect('/listUsers');
      }
      if (results.length === 0) {
        req.flash('error', 'User not found');
        return res.redirect('/listUsers');
      }
      res.render('updateUser', {
        userData: results[0],
        user: req.session.user,
        messages: req.flash('error'),   // <-- pass errors
        success: req.flash('success')   // <-- pass success
      });
    });
  },

  // Update user (Admin) — updates password only if provided
  updateUser: (req, res) => {
    const id = req.params.id;
    const { username, email, address, contact, role, password } = req.body;

    if (!username || !email || !address || !contact || !role) {
      req.flash('error', 'Username, email, address, contact, and role are required.');
      return res.redirect(`/updateUser/${id}`);
    }

    // If password provided, update it; otherwise leave it unchanged
    const withPwd = password && password.trim() !== '';

    const sql = withPwd
      ? `UPDATE users
           SET username=?, email=?, password=SHA1(?), address=?, contact=?, role=?
         WHERE id=?`
      : `UPDATE users
           SET username=?, email=?, address=?, contact=?, role=?
         WHERE id=?`;

    const params = withPwd
      ? [username, email, password, address, contact, role, id]
      : [username, email, address, contact, role, id];

    db.query(sql, params, (err) => {
      if (err) {
        console.error('Error updating user:', err);
        req.flash('error', 'Error updating user.');
        return res.redirect(`/updateUser/${id}`);
      }
      req.flash('success', 'User updated successfully.');
      res.redirect('/listUsers');
    });
  },

  deleteUser: (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [id], (err) => {
      if (err) {
        console.error('Error deleting user:', err);
        req.flash('error', 'Error deleting user.');
        return res.redirect('/listUsers');
      }
      req.flash('success', 'User deleted.');
      res.redirect('/listUsers');
    });
  }
};

module.exports = UserController;
