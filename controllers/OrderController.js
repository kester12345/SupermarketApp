const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const db = require('../db');

const OrderController = {

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

          // FIXED: remove only purchased items
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

    }); // end create order
  }

};

module.exports = OrderController;