// controllers/AuthController.js
const db = require('../db');
const sha1 = require('sha1');
const speakeasy = require("speakeasy");   // ✅ MISSING IMPORT FIXED
const CartItem = require('../models/CartItem');
const User = require('../models/User');

const AuthController = {

    // ============================================
    // 📝 REGISTER USER
    // ============================================
    register: (req, res) => {
        const { username, email, password, address, contact } = req.body;

        const formData = { username, email, address, contact };

        if (!username || !email || !password) {
            req.flash("error", "All fields are required.");
            req.flash("formData", formData);
            return res.redirect("/register");
        }

        const hashedPassword = sha1(password);

        User.create(username, email, hashedPassword, address, contact, "user", (err) => {
            if (err) {
                req.flash("error", "Email already exists.");
                req.flash("formData", formData);
                return res.redirect("/register");
            }

            req.flash("success", "Registration successful! Please log in.");
            return res.redirect("/login");
        });
    },

    // ============================================
    // 🔐 LOGIN USER + RESTORE CART
    // ============================================
    login: (req, res) => {
        const { email, password } = req.body;
        const hashedInputPassword = sha1(password);

        User.findByEmail(email, (err, user) => {
            if (err || !user) {
                req.flash("error", "Invalid email or password");
                return res.redirect("/login");
            }

            if (user.password !== hashedInputPassword) {
                req.flash("error", "Invalid email or password");
                return res.redirect("/login");
            }

            // -----------------------------
            // ⭐ 2FA CHECK 
            // -----------------------------
            if (user.twofa_enabled) {
                req.session.temp_user_id = user.id;
                return res.redirect("/verify-2fa");
            }

            // -----------------------------
            // ⭐ NORMAL LOGIN
            // -----------------------------
            req.session.user = user;

            // ⭐ Restore Cart
            CartItem.getByUserId(user.id, (err, items) => {
                if (!err && items) {
                    req.session.cart = items.map(item => ({
                        id: item.product_id,
                        productName: item.productName,
                        price: Number(item.price),
                        quantity: Number(item.quantity),
                        image: item.image,
                        maxStock: Number(item.maxStock)
                    }));
                }

                req.session.save(() => res.redirect("/"));
            });
        });
    },

    // ============================================
    // 🚪 LOGOUT USER
    // ============================================
    logout: (req, res) => {
        req.session.destroy(() => {
            res.redirect("/login");
        });
    },

    // ============================================
    // 2FA SCREEN
    // ============================================
    show2FAPrompt: (req, res) => {
        res.render("verify2fa", {
            messages: req.flash("error")
        });
    },

    // ============================================
    // VERIFY LOGIN 2FA
    // ============================================
    verifyLogin2FA: (req, res) => {
        const token = req.body.token;
        const userId = req.session.temp_user_id;

        if (!userId) {
            req.flash("error", "Session expired. Please login again.");
            return res.redirect("/login");
        }

        User.getById(userId, (err, user) => {
            if (err || !user) {
                req.flash("error", "User not found.");
                return res.redirect("/login");
            }

            const verified = speakeasy.totp.verify({
                secret: user.twofa_secret,
                encoding: "base32",
                token: token
            });

            if (!verified) {
                req.flash("error", "Invalid authentication code");
                return res.redirect("/verify-2fa");
            }

            // 2FA SUCCESS → LOGIN USER
            req.session.user = user;
            req.session.temp_user_id = null;

            // ⭐ Restore Cart
            CartItem.getByUserId(user.id, (err, items) => {
                if (!err && items) {
                    req.session.cart = items.map(item => ({
                        id: item.product_id,
                        productName: item.productName,
                        price: Number(item.price),
                        quantity: Number(item.quantity),
                        image: item.image,
                        maxStock: Number(item.maxStock)
                    }));
                }

                req.session.save(() => res.redirect("/"));
            });
        });
    }
};

module.exports = AuthController;