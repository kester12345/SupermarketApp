const express = require("express");
const router = express.Router();

const OrderController = require("../controllers/OrderController");
const { checkAuthenticated } = require("../middleware/authMiddleware");

router.get("/my-orders", checkAuthenticated, OrderController.viewUserOrders);
router.get("/my-orders/:orderId", checkAuthenticated, OrderController.viewUserOrderDetails);

module.exports = router;