// models/Product.js
const db = require('../db');

const Product = {
    getAll: (callback) => {
        db.query('SELECT * FROM products', (err, results) => {
            callback(err, results);
        });
    },

    getById: (id, callback) => {
        db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
            callback(err, results[0]);
        });
    },

    add: (data, callback) => {
        const { productName, quantity, price, image } = data;
        const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
        db.query(sql, [productName, quantity, price, image], callback);
    },

    update: (id, data, callback) => {
        const { productName, quantity, price, image } = data;
        const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
        db.query(sql, [productName, quantity, price, image, id], callback);
    },

    delete: (id, callback) => {
        db.query('DELETE FROM products WHERE id = ?', [id], callback);
    }
};

module.exports = Product;

