const db = require('../db');

const Order = {

  create: (userId, paymentMode, callback) => {

    const orderId = "ORD-" + Date.now();      // PK
    const referenceId = "REF-" + Date.now();  // must be unique

    const sql = `
      INSERT INTO orders 
      (order_id, user_id, referenceId, paymentMode, status)
      VALUES (?, ?, ?, ?, 'completed')
    `;

    db.query(sql, [orderId, userId, referenceId, paymentMode], (err, result) => {
      if (err) return callback(err);

      // Return the actual order_id string, not insertId
      callback(null, orderId);
    });
  }

};

module.exports = Order;