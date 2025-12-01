// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');

// View cart
router.get('/cart', CartController.viewCart);

// Add product to cart
router.post('/cart/add/:id', CartController.addToCart);

// Remove one item from cart
router.post('/cart/remove/:id', CartController.removeFromCart);

// Clear entire cart
router.post('/cart/clear', CartController.clearCart);

// Update quantity (+ / -)
router.post('/cart/updateQty/:id', CartController.updateQuantity);

module.exports = router;