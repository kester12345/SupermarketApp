const db = require('../db');

const OrderItem = {
  create: (orderId, item, callback) => {
    const sql = `
      INSERT INTO order_items 
      (order_id, product_id, product_name, unit_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const subtotal = item.price * item.quantity;

    db.query(sql, [
      orderId,
      item.id,
      item.productName,
      item.price,
      item.quantity,
      subtotal
    ], callback);
  }
};

module.exports = OrderItem;