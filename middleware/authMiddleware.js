module.exports.checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash("error", "Please log in to view this page.");
    return res.redirect("/login");
};

module.exports.checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === "admin") {
        return next();
    }
    req.flash("error", "Access denied.");
    return res.redirect("/shopping");
};