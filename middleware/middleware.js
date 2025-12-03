// middleware.js

// ======================
// AUTHENTICATION MIDDLEWARE
// ======================
module.exports.checkAuthenticated = (req, res, next) => {
    // User has passed password but has NOT completed 2FA yet
    if (req.session.temp_user_id) {
        req.flash("error", "Please complete 2FA verification.");
        return res.redirect("/login-2fa");
    }

    // Fully logged-in user (session.user exists)
    if (req.session.user) {
        return next();
    }

    req.flash("error", "Please log in to view this resource.");
    return res.redirect("/login");
};

// ======================
// ADMIN ONLY MIDDLEWARE
// ======================
module.exports.checkAdmin = (req, res, next) => {
    // Only allow fully authenticated admins
    if (req.session.user && req.session.user.role === "admin") {
        return next();
    }

    req.flash("error", "Access denied.");
    return res.redirect("/shopping");
};