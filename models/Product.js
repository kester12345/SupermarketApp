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
        const { productName, quantity, price, image, category } = data;
        const sql = `
        INSERT INTO products (productName, quantity, price, image, category)
        VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sql, [productName, quantity, price, image, category], callback);
    },

    update: (id, data, callback) => {
        const { productName, quantity, price, image, category } = data;
        const sql = `
        UPDATE products 
        SET productName = ?, quantity = ?, price = ?, image = ?, category = ?
        WHERE id = ?
        `;
        db.query(sql, [productName, quantity, price, image, category, id], callback);
    },

    delete: (id, callback) => {
        db.query(`DELETE FROM products WHERE id = ?`, [id], callback);
    }
};

module.exports = Product;