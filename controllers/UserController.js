// controllers/UserController.js
const db = require('../db');
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

const UserController = {

    // ============================
    // ENABLE 2FA — STEP 1: GENERATE QR
    // ============================
    enable2FA: async (req, res) => {
        const secret = speakeasy.generateSecret({ length: 20 });

        const qrCode = await qrcode.toDataURL(secret.otpauth_url);

        // Temporarily store until user verifies
        req.session.setup_2fa_secret = secret.base32;

        res.render("enable2fa", {
            qrCode,
            secret: secret.base32,
            user: req.session.user,
            messages: req.flash("error"),
            success: req.flash("success")
        });
    },

    // ============================
    // ENABLE 2FA — STEP 2: VERIFY & SAVE
    // ============================
    verify2FA: (req, res) => {
        const token = req.body.token;
        const secret = req.session.setup_2fa_secret;

        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token
        });

        if (!verified) {
            req.flash("error", "Invalid code. Try again.");
            return res.redirect("/enable-2fa");
        }

        // Save 2FA to DB
        db.query(
            "UPDATE users SET twofa_enabled = 1, twofa_secret = ? WHERE id = ?",
            [secret, req.session.user.id],
            (err) => {
                if (err) console.error(err);
            }
        );

        delete req.session.setup_2fa_secret;

        req.flash("success", "Two-factor authentication enabled.");
        res.redirect("/");
    },

    // ============================
    // ADMIN: LIST ALL USERS
    // ============================
    listUser: (req, res) => {
        const sql = 'SELECT * FROM users';

        db.query(sql, (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).send('Error retrieving users');
            }

            res.render('listUser', {
                users,
                user: req.session.user,
                messages: req.flash('error'),
                success: req.flash('success')
            });
        });
    },

    // ============================
    // ADMIN: ADD NEW USER
    // ============================
    addUser: (req, res) => {
        const { username, email, password, address, contact, role } = req.body;

        if (!username || !email || !password || !address || !contact || !role) {
            req.flash('error', 'All fields are required.');
            req.flash('formData', req.body);
            return res.redirect('/addUser');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long.');
            req.flash('formData', req.body);
            return res.redirect('/addUser');
        }

        const sql = `
            INSERT INTO users (username, email, password, address, contact, role)
            VALUES (?, ?, SHA1(?), ?, ?, ?)
        `;

        db.query(sql, [username, email, password, address, contact, role], (err) => {
            if (err) {
                console.error('Error adding user:', err);
                req.flash('error', 'Error adding user.');
                return res.redirect('/addUser');
            }

            req.flash('success', 'User added successfully.');
            res.redirect('/listUser');
        });
    },

    // ============================
    // ADMIN: LOAD USER FOR EDIT FORM
    // ============================
    getUserById: (req, res) => {
        const id = req.params.id;

        db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                req.flash('error', 'Error retrieving user');
                return res.redirect('/listUser');
            }

            if (results.length === 0) {
                req.flash('error', 'User not found');
                return res.redirect('/listUser');
            }

            res.render('updateUser', {
                userData: results[0],
                user: req.session.user,
                messages: req.flash('error'),
                success: req.flash('success')
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
            req.flash('error', 'All fields except password are required.');
            return res.redirect(`/updateUser/${id}`);
        }

        const withPwd = password && password.trim() !== '';

        const sql = withPwd
            ? `UPDATE users SET username=?, email=?, password=SHA1(?), address=?, contact=?, role=? WHERE id=?`
            : `UPDATE users SET username=?, email=?, address=?, contact=?, role=? WHERE id=?`;

        const params = withPwd
            ? [username, email, password, address, contact, role, id]
            : [username, email, address, contact, role, id];

        db.query(sql, params, (err) => {
            if (err) {
                console.error('Error updating user:', err);
                req.flash('error', 'Error updating user.');
                return res.redirect(`/updateUser/${id}`);
            }

            req.flash('success', 'User updated successfully.');
            res.redirect('/listUser');
        });
    },

    // ============================
    // ADMIN: DELETE USER
    // ============================
    deleteUser: (req, res) => {
        const id = req.params.id;

        db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Error deleting user:', err);
                req.flash('error', 'Error deleting user.');
                return res.redirect('/listUser');
            }

            req.flash('success', 'User deleted.');
            res.redirect('/listUser');
        });
    }

};

module.exports = UserController;