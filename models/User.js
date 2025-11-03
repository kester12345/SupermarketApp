// models/User.js
const db = require('../db');

const User = {
    register: (data, callback) => {
        const { username, email, password, address, contact, role } = data;
        const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
        db.query(sql, [username, email, password, address, contact, role], callback);
    },

    findByEmailAndPassword: (email, password, callback) => {
        const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
        db.query(sql, [email, password], (err, results) => {
            callback(err, results[0]);
        });
    },

    getAll: (callback) => {
        db.query('SELECT * FROM users', callback);
    },

    getById: (id, callback) => {
        db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
            callback(err, results[0]);
        });
    }
};

module.exports = User;
