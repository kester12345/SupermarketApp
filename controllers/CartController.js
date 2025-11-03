// controllers/CartController.js
const Product = require('../models/Product');

const CartController = {
  // 🛒 Add a product to the cart
  addToCart: (req, res) => {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    Product.getById(productId, (err, product) => {
      if (err) {
        console.error('Error fetching product for cart:', err);
        return res.status(500).send('Error retrieving product');
      }

      if (!product) {
        console.warn('Product not found for cart add:', productId);
        return res.status(404).send('Product not found');
      }

      // Ensure session cart exists
      if (!req.session.cart) req.session.cart = [];

      // Check if product already in cart
      const existingItem = req.session.cart.find(item => item.id === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        req.session.cart.push({
          id: product.id,
          productName: product.productName,
          price: product.price,
          quantity: quantity,
          image: product.image
        });
      }

      console.log('Cart after add:', req.session.cart);
      res.redirect('/cart');
    });
  },

  // 🧾 View cart page
  viewCart: (req, res) => {
    const cart = req.session.cart || [];

    // Calculate total price
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.render('cart', {
      cart,
      total,
      user: req.session.user
    });
  },

  // ❌ Remove product from cart
  removeFromCart: (req, res) => {
    const productId = parseInt(req.params.id);

    if (req.session.cart && req.session.cart.length > 0) {
      req.session.cart = req.session.cart.filter(item => item.id !== productId);
    }

    console.log('Cart after removal:', req.session.cart);
    res.redirect('/cart');
  }
};

module.exports = CartController;
