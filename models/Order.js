const db = require('../db');

const Order = {

  // Create order
  create: (userId, paymentMode, callback) => {
    const orderId = "ORD-" + Date.now();
    const referenceId = "REF-" + Date.now();

    const sql = `
      INSERT INTO orders 
      (order_id, user_id, referenceId, paymentMode, status)
      VALUES (?, ?, ?, ?, 'completed')
    `;

    db.query(sql, [orderId, userId, referenceId, paymentMode], (err) => {
      if (err) return callback(err);
      callback(null, orderId);
    });
  },

  // Get all orders (for history list)
  getAll: (callback) => {
    const sql = `
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.order_id DESC
    `;

    db.query(sql, callback);
  },

  // Get order + its items
  getWithItems: (orderId, callback) => {
    const sql = `
      SELECT 
        o.order_id,
        o.user_id,
        o.paymentMode,
        o.status,
        oi.product_name,
        oi.unit_price,
        oi.quantity,
        oi.subtotal
      FROM orders o
      JOIN order_items oi
        ON o.order_id = oi.order_id
      WHERE o.order_id = ?
    `;

    db.query(sql, [orderId], callback);
  },
  
  // Get orders by user ID (for user order history)
  getOrdersByUserId: (userId, callback) => {
    const sql = `
        SELECT 
            o.id AS order_id,
            o.user_id,
            o.total_amount,
            o.payment_mode,
            o.status,
            o.created_at
        FROM orders o
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
    `;
    db.query(sql, [userId], callback);
  }
};

module.exports = Order;