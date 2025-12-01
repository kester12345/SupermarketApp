const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");

// USER — Order history
router.get("/my-orders", OrderController.viewUserOrders);

// USER — View individual order
router.get("/my-orders/:orderId", OrderController.viewUserOrderDetails);

// ADMIN — View all orders
router.get("/admin/orders", OrderController.adminOrderHistory);

// ADMIN — View specific order
router.get("/admin/orders/:id", OrderController.viewOrderDetails);

module.exports = router;