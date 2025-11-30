// controllers/CartController.js
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');   // << ADD THIS

const CartController = {

    // =========================================================
    // 🛒 ADD ITEM TO CART (SESSION + DATABASE)
    // =========================================================
    addToCart: (req, res) => {
        if (!req.session.user) {
            req.flash("error", "Please login first.");
            return res.redirect("/login");
        }

        const userId = req.session.user.id;   // logged-in user
        const productId = Number(req.params.id);
        const requestedQty = Number(req.body.quantity);

        Product.getById(productId, (err, product) => {
            if (err || !product) {
                req.flash("error", "Product not found.");
                return res.redirect("/shopping");
            }

            const dbStock = Number(product.quantity);

            req.session.cart = req.session.cart || [];

            // Check if product already in session cart
            const existingItem = req.session.cart.find(i => Number(i.id) === productId);
            const currentQty = existingItem ? Number(existingItem.quantity) : 0;

            // ❗ Prevent exceeding DB stock
            if (currentQty + requestedQty > dbStock) {
                req.flash("error",
                    `Stock limit reached. You already have ${currentQty}. Max allowed: ${dbStock}.`
                );
                return res.redirect("/shopping");
            }

            // -------------------------------
            // SESSION UPDATE
            // -------------------------------
            if (existingItem) {
                existingItem.quantity = currentQty + requestedQty;
            } else {
                req.session.cart.push({
                    id: productId,
                    productName: product.productName,
                    price: Number(product.price),
                    quantity: requestedQty,
                    image: product.image,
                    maxStock: dbStock
                });
            }

            // -------------------------------
            // DATABASE UPDATE
            // -------------------------------
            CartItem.findExisting(userId, productId, (err, rows) => {
                if (err) console.log(err);

                if (rows.length > 0) {
                    // update quantity
                    const newQty = rows[0].quantity + requestedQty;
                    CartItem.update(userId, productId, newQty, () => {
                        req.flash("success", "Item added to cart!");
                        return res.redirect("/shopping");
                    });

                } else {
                    // insert new row
                    CartItem.insert(userId, productId, requestedQty, () => {
                        req.flash("success", "Item added to cart!");
                        return res.redirect("/shopping");
                    });
                }
            });
        });
    },

    // =========================================================
    // 🧾 VIEW CART (AUTO SYNC WITH DB STOCK)
    // =========================================================
    viewCart: (req, res) => {
        const cart = req.session.cart || [];

        const checks = cart.map(item => {
            return new Promise(resolve => {
                Product.getById(item.id, (err, product) => {
                    if (!err && product) {
                        const dbStock = Number(product.quantity);

                        if (Number(item.quantity) > dbStock) {
                            item.quantity = dbStock;
                        }

                        item.maxStock = dbStock;
                    }
                    resolve();
                });
            });
        });

        Promise.all(checks).then(() => {
            const total = cart.reduce((sum, item) =>
                sum + Number(item.price) * Number(item.quantity), 0);

            res.render("cart", {
                cart,
                total,
                user: req.session.user
            });
        });
    },

    // =========================================================
    // ❌ REMOVE ONE ITEM
    // =========================================================
    removeFromCart: (req, res) => {
        const userId = req.session.user.id;
        const productId = Number(req.params.id);

        // remove from session
        req.session.cart = (req.session.cart || []).filter(
            item => Number(item.id) !== productId
        );

        // remove from DB
        CartItem.delete(userId, productId, () => {
            return res.redirect('/cart');
        });
    },

    // =========================================================
    // 🧹 CLEAR ALL CART ITEMS
    // =========================================================
    clearCart: (req, res) => {
        const userId = req.session.user.id;

        req.session.cart = [];

        CartItem.clear(userId, () => {
            return res.redirect('/cart');
        });
    },
    updateQuantity: (req, res) => {
        const userId = req.session.user.id;
        const productId = Number(req.params.id);
        const action = req.body.action;

        const item = req.session.cart.find(i => i.id === productId);

        if (!item) return res.redirect('/cart');

        if (action === "plus" && item.quantity < item.maxStock) {
            item.quantity++;
        }

        if (action === "minus" && item.quantity > 1) {
            item.quantity--;
        }

        // update DB
        CartItem.update(userId, productId, item.quantity, () => {
            return res.redirect('/cart');
        });
    }
};

module.exports = CartController;