const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const db = require('../db');

const OrderController = {

  // =============================
  // USER — CHECKOUT SELECTED ITEMS
  // =============================
  checkoutSelected: (req, res) => {

    const cart = req.session.cart || [];
    const selectedIds = req.body.ids;

    if (!selectedIds) {
      req.flash('error', 'Please select items to checkout.');
      return res.redirect('/cart');
    }

    const idsArray = Array.isArray(selectedIds)
      ? selectedIds.map(id => Number(id))
      : [Number(selectedIds)];

    const selectedItems = cart.filter(item => idsArray.includes(item.id));

    if (selectedItems.length === 0) {
      req.flash('error', 'Selected items not found.');
      return res.redirect('/cart');
    }

    // Create order
    Order.create(req.session.user.id, "cash", (err, orderId) => {
      if (err) {
        console.error("Order creation error:", err);
        return res.status(500).send("Order creation failed");
      }

      // Insert order items
      const itemPromises = selectedItems.map(item => {
        return new Promise((resolve, reject) => {
          OrderItem.create(orderId, item, err => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // Update product stock
      const stockPromises = selectedItems.map(item =>
        new Promise((resolve, reject) => {
          db.query(
            "UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
            [item.quantity, item.id, item.quantity],
            err => err ? reject(err) : resolve()
          );
        })
      );

      // Complete checkout
      Promise.all([...itemPromises, ...stockPromises])
        .then(() => {

          // Remove only purchased items
          req.session.cart = cart.filter(i => !idsArray.includes(i.id));

          req.session.save(() => {
            res.render('orderSuccess', {
              orderId,
              items: selectedItems,
              user: req.session.user
            });
          });

        })
        .catch(err => {
          console.error("Checkout error:", err);
          req.flash("error", "Checkout failed.");
          res.redirect("/cart");
        });

    }); // end Order.create
  },

  // =============================
  // ADMIN — VIEW ALL ORDERS
  // =============================
  viewAllOrders: (req, res) => {
    Order.getAll((err, orders) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Failed to load order history");
      }

      res.render('orderHistory', {
        user: req.session.user,
        orders
      });
    });
  },

  // =============================
  // ADMIN — VIEW INDIVIDUAL ORDER DETAILS
  // =============================
  viewOrderDetails: (req, res) => {
    const orderId = req.params.id;

    Order.getWithItems(orderId, (err, rows) => {
      if (err || rows.length === 0) {
        console.error(err);
        return res.status(500).send("Order details not found");
      }

      const order = {
        order_id: rows[0].order_id,
        user_id: rows[0].user_id,
        paymentMode: rows[0].paymentMode,
        status: rows[0].status,
        items: rows
      };

      res.render('orderDetails', {
        user: req.session.user,
        order
      });
    });
  },

  // ===============================
  // USER ORDER HISTORY
  // ===============================
  viewUserOrders: (req, res) => {
      const userId = req.session.user.id;

      Order.getOrdersByUserId(userId, (err, orders) => {
          if (err) {
              console.log("Error retrieving user orders:", err);
              req.flash("error", "Unable to load your order history.");
              return res.redirect("/");
          }

          res.render("userOrderHistory", {
              orders,
              user: req.session.user,
              messages: req.flash("error")
          });
      });
  },
  // ================================
  // USER — VIEW ORDER DETAILS
  // ================================
  viewUserOrderDetails: (req, res) => {
      const userId = req.session.user.id;
      const orderId = req.params.orderId;

      const orderSql = `
          SELECT 
              order_id, 
              user_id, 
              paymentMode, 
              referenceId, 
              status
          FROM orders
          WHERE order_id = ? AND user_id = ?
      `;

      const itemsSql = `
          SELECT oi.product_id, oi.quantity, oi.unit_price,
                p.productName, p.image
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
      `;

      db.query(orderSql, [orderId, userId], (err, orderRows) => {
          if (err) {
              console.log("Error loading order:", err);
              req.flash("error", "Could not load order.");
              return res.redirect("/my-orders");
          }

          if (orderRows.length === 0) {
              req.flash("error", "Order not found.");
              return res.redirect("/my-orders");
          }

          const order = orderRows[0];

          db.query(itemsSql, [orderId], (err, itemRows) => {
              if (err) {
                  console.log("Error loading items:", err);
                  req.flash("error", "Could not load order items.");
                  return res.redirect("/my-orders");
              }

              order.items = itemRows;

              res.render("userOrderDetails", {
                  user: req.session.user,
                  order
              });
          });
      });
  },
adminOrderHistory: (req, res) => {
    const sql = `
        SELECT 
            o.order_id,
            o.user_id,
            u.username,
            o.paymentMode,
            o.status,
            o.referenceId
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.order_id DESC
    `;

    db.query(sql, (err, orders) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error retrieving orders");
        }

        res.render("orderHistory", {
            orders,
            user: req.session.user
        });
    });
}
};

module.exports = OrderController;