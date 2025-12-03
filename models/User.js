// models/User.js
const db = require('../db');

const User = {

    // Register (admin or public)
    register: (data, callback) => {
        const { username, email, password, address, contact, role } = data;
        const sql = `
            INSERT INTO users (username, email, password, address, contact, role)
            VALUES (?, ?, SHA1(?), ?, ?, ?)
        `;
        db.query(sql, [username, email, password, address, contact, role], (err, result) => {
            if (err && err.code === "ER_DUP_ENTRY") {
                return callback({ duplicate: true });
            }
            callback(err, result);
        });
    },

    // Required for login (email only)
    findByEmail: (email, callback) => {
        db.query(`SELECT * FROM users WHERE email = ?`, [email], (err, rows) => {
            callback(err, rows[0]);
        });
    },

    // Required for login (email + password)
    findByEmailAndPassword: (email, password, callback) => {
        const sql = `SELECT * FROM users WHERE email = ? AND password = SHA1(?)`;
        db.query(sql, [email, password], (err, rows) => {
            callback(err, rows[0]);
        });
    },

    // ❗ REQUIRED FOR 2FA (your controller calls this)
    getById: (id, callback) => {
        db.query(`SELECT * FROM users WHERE id = ?`, [id], (err, rows) => {
            callback(err, rows[0]);
        });
    },

    // Admin: List all users
    getAll: (callback) => {
        db.query(`SELECT * FROM users`, callback);
    },

    Supdate2FA: (userId, secret, callback) => {
        db.query(
            "UPDATE users SET twoFASecret = ?, is2FAEnabled = 1 WHERE id = ?",
            [secret, userId],
            callback
        );
    },

    disable2FA: (userId, callback) => {
        db.query(
            "UPDATE users SET twoFASecret = NULL, is2FAEnabled = 0 WHERE id = ?",
            [userId],
            callback
        );
    },

    findById: (id, callback) => {
        db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
            callback(err, rows[0]);
        });
    }
};

module.exports = User;