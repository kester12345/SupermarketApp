const db = require('../db');

const CartItem = {
    findExisting(userId, productId, callback) {
        const sql = "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?";
        db.query(sql, [userId, productId], callback);
    },

    insert(userId, productId, qty, callback) {
        const sql = "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)";
        db.query(sql, [userId, productId, qty], callback);
    },

    update(userId, productId, qty, callback) {
        const sql = "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?";
        db.query(sql, [qty, userId, productId], callback);
    },

    // 🔥 DELETE 1 ITEM 
    delete(userId, productId, callback) {
        const sql = "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?";
        db.query(sql, [userId, productId], callback);
    },

    // 🔥 CLEAR ENTIRE CART
    clear(userId, callback) {
        const sql = "DELETE FROM cart_items WHERE user_id = ?";
        db.query(sql, [userId], callback);
    },

    // ⭐ IMPORTANT: GET USER CART (FOR SESSION RESTORE)
    getByUserId(userId, callback) {
        const sql = `
            SELECT 
                ci.product_id,
                ci.quantity,
                p.productName,
                p.price,
                p.image,
                p.quantity AS maxStock
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
        `;
        db.query(sql, [userId], callback);
    }
};

module.exports = CartItem;