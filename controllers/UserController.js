// controllers/UserController.js
const db = require('../db');
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto = require("crypto");
const User = require("../models/User");

const UserController = {

    // ============================
    // USER PROFILE – SHOW PAGE
    // ============================
    profile: (req, res) => {
        db.query("SELECT * FROM users WHERE id = ?", [req.session.user.id], (err, user) => {
            if (err) console.log(err);

            res.render("profile", {
                user: user[0],
                messages: req.flash("error"),
                success: req.flash("success")
            });
        });
    },

    // ============================
    // ENABLE 2FA — STEP 1: GENERATE QR
    // ============================
    enable2FA: async (req, res) => {

        // Don't regenerate secret if already created
        if (!req.session.setup_2fa_secret) {
            const secret = speakeasy.generateSecret({
                length: 20,
                name: `SupermarketApp (${req.session.user.email})`,
                issuer: "SupermarketApp"
            });

            req.session.setup_2fa_secret = secret.base32;
            req.session.setup_2fa_otpauth = secret.otpauth_url;
        }

        const qrCode = await qrcode.toDataURL(req.session.setup_2fa_otpauth);

        res.render("enable2fa", {
            qrCode,
            secret: req.session.setup_2fa_secret,
            user: req.session.user,
            messages: req.flash("error"),
            success: req.flash("success")
        });
    },

    // ============================
    // ENABLE 2FA — STEP 2: VERIFY OTP
    // ============================
    verify2FA: (req, res) => {
        const token = req.body.token;
        const secret = req.session.setup_2fa_secret;

        // Verify OTP
        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token,
            window: 1
        });

        if (!verified) {
            req.flash("error", "Invalid authentication code. Try again.");
            return res.redirect("/enable-2fa");
        }

        // Save secret to DB
        db.query(
            "UPDATE users SET twofa_enabled = 1, twofa_secret = ? WHERE id = ?",
            [secret, req.session.user.id],
            (err) => {
                if (err) console.error(err);
            }
        );

        delete req.session.setup_2fa_secret;

        req.flash("success", "Two-factor authentication enabled.");
        res.redirect("/profile");
    },

    // ============================
    // DISABLE 2FA
    // ============================
    disable2FA: (req, res) => {
        db.query(
            "UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?",
            [req.session.user.id]
        );

        req.flash("success", "Two-factor authentication has been disabled.");
        res.redirect("/profile");
    },

    // ============================
    // ADMIN: LIST USERS
    // ============================
    listUser: (req, res) => {
        db.query("SELECT * FROM users", (err, users) => {
            if (err) return res.status(500).send("Error retrieving users");

            res.render("listUser", {
                users,
                user: req.session.user,
                messages: req.flash("error"),
                success: req.flash("success")
            });
        });
    },

    // ============================
    // ADMIN: ADD USER
    // ============================
    addUser: (req, res) => {
        const { username, email, password, address, contact, role } = req.body;

        if (!username || !email || !password || !address || !contact || !role) {
            req.flash("error", "All fields are required.");
            return res.redirect("/addUser");
        }

        if (password.length < 6) {
            req.flash("error", "Password must be at least 6 characters.");
            return res.redirect("/addUser");
        }

        db.query(
            `INSERT INTO users (username, email, password, address, contact, role)
            VALUES (?, ?, SHA1(?), ?, ?, ?)`,
            [username, email, password, address, contact, role],
            (err) => {

                if (err && err.code === "ER_DUP_ENTRY") {
                    req.flash("error", "This email already exists. Please use a different email.");
                    return res.redirect("/addUser");
                }

                if (err) {
                    req.flash("error", "Error adding user.");
                    return res.redirect("/addUser");
                }

                req.flash("success", "User added successfully.");
                res.redirect("/listUser");
            }
        );
    },

    // ============================
    // ADMIN: FETCH USER FOR EDIT
    // ============================
    getUserById: (req, res) => {
        db.query("SELECT * FROM users WHERE id = ?", [req.params.id], (err, results) => {
            if (err || results.length === 0) {
                req.flash("error", "User not found");
                return res.redirect("/listUser");
            }

            res.render("updateUser", {
                userData: results[0],
                user: req.session.user,
                messages: req.flash("error"),
                success: req.flash("success")
            });
        });
    },

    // ============================
    // ADMIN: UPDATE USER
    // ============================
    updateUser: (req, res) => {
        const id = req.params.id;
        const { username, email, address, contact, role, password } = req.body;

        if (!username || !email || !address || !contact || !role) {
            req.flash("error", "All fields (except password) are required.");
            return res.redirect(`/updateUser/${id}`);
        }

        const query = password.trim()
            ? `UPDATE users SET username=?, email=?, password=SHA1(?), address=?, contact=?, role=? WHERE id=?`
            : `UPDATE users SET username=?, email=?, address=?, contact=?, role=? WHERE id=?`;

        const params = password.trim()
            ? [username, email, password, address, contact, role, id]
            : [username, email, address, contact, role, id];

        db.query(query, params, (err) => {

            if (err && err.code === "ER_DUP_ENTRY") {
                req.flash("error", "Email already exists. Choose another email.");
                return res.redirect(`/updateUser/${id}`);
            }

            if (err) {
                req.flash("error", "Error updating user.");
                return res.redirect(`/updateUser/${id}`);
            }

            req.flash("success", "User updated successfully.");
            res.redirect("/listUser");

        });
    },

    // ============================
    // ADMIN: DELETE USER
    // ============================
    deleteUser: (req, res) => {

        // 1. Check the role of the user being deleted
        db.query("SELECT role FROM users WHERE id = ?", [req.params.id], (err, results) => {
            if (err || results.length === 0) {
                req.flash("error", "User not found.");
                return res.redirect("/listUser");
            }

            // 2. Prevent deleting another admin
            if (results[0].role === "admin") {
                req.flash("error", "You cannot delete another admin.");
                return res.redirect("/listUser");
            }

            // 3. Proceed with normal delete if NOT admin
            db.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {

                if (err && err.code === "ER_ROW_IS_REFERENCED_2") {
                    req.flash("error", "Cannot delete user — user has existing orders.");
                    return res.redirect("/listUser");
                }

                if (err) {
                    req.flash("error", "Error deleting user.");
                    return res.redirect("/listUser");
                }

                req.flash("success", "User deleted.");
                return res.redirect("/listUser");
            });
        });
    },

    // ============================
    // UPDATE EMAIL
    // ============================
    updateEmail: (req, res) => {
        const { newEmail } = req.body;

        if (!newEmail.trim()) {
            req.flash("error", "Email cannot be empty.");
            return res.redirect("/profile");
        }

        db.query("UPDATE users SET email = ? WHERE id = ?", [newEmail, req.session.user.id], (err) => {
            if (err) {
                req.flash("error", "Failed to update email.");
                return res.redirect("/profile");
            }

            req.session.user.email = newEmail;

            req.flash("success", "Email updated successfully.");
            res.redirect("/profile");
        });
    },

    // ============================
    // UPDATE PASSWORD — VERIFY OLD
    // ============================
    updatePassword: (req, res) => {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            req.flash("error", "All password fields are required.");
            return res.redirect("/profile");
        }

        if (newPassword !== confirmPassword) {
            req.flash("error", "New passwords do not match.");
            return res.redirect("/profile");
        }

        // 1. Verify old password
        db.query("SELECT password FROM users WHERE id = ?", [req.session.user.id], (err, results) => {
            if (err || results.length === 0) {
                req.flash("error", "Error verifying old password.");
                return res.redirect("/profile");
            }

            const storedHash = results[0].password;
            const oldHash = crypto.createHash("sha1").update(oldPassword).digest("hex");

            if (oldHash !== storedHash) {
                req.flash("error", "Old password is incorrect.");
                return res.redirect("/profile");
            }

            // 2. Update to new password
            const newHash = crypto.createHash("sha1").update(newPassword).digest("hex");

            db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, req.session.user.id], (err) => {
                if (err) {
                    req.flash("error", "Failed to update password.");
                    return res.redirect("/profile");
                }

                req.flash("success", "Password updated successfully.");
                res.redirect("/profile");
            });
        });
    }
};

module.exports = UserController;