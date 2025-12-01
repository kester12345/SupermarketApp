// app.js
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const db = require('./db');
const sha1 = require('sha1');

// Controllers
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CartController = require('./controllers/CartController');
const AuthController = require('./controllers/AuthController');

// Route files
const orderRoutes = require("./routes/OrderRoutes");

// ======================
// Multer – Image Upload
// ======================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images'),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// ======================
// Express + EJS Setup
// ======================
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// ======================
// Session + Flash
// ======================
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(flash());

// ======================
// Middleware
// ======================
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied');
    res.redirect('/shopping');
};

// ======================
// ROUTES
// ======================

// ⭐ NEW: Order routes (User order history + order details)
app.use("/", orderRoutes);

// Home
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// --------------------
// USER REGISTRATION
// --------------------
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});
app.post('/register', AuthController.register);

// Login
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});
app.post('/login', AuthController.login);

// Logout
app.get('/logout', AuthController.logout);

// --------------------
// PRODUCT ROUTES
// --------------------
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.list);

app.get('/shopping', checkAuthenticated, ProductController.shopping);

app.get('/product/:id', checkAuthenticated, ProductController.getById);

app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});

app.post('/addProduct', upload.single('image'), ProductController.add);

app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const Product = require('./models/Product');
    Product.getById(req.params.id, (err, product) => {
        if (err) return res.status(500).send("Error retrieving product");
        if (!product) return res.status(404).send("Product not found");
        res.render('updateProduct', { product, user: req.session.user });
    });
});
app.post('/updateProduct/:id', upload.single('image'), ProductController.update);
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.delete);

// --------------------
// ADMIN USER MGMT
// --------------------
app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('admin', { user: req.session.user });
});

app.get('/listUser', checkAuthenticated, checkAdmin, (req, res) => {
    db.query("SELECT * FROM users", (err, users) => {
        if (err) return res.status(500).send("Error retrieving users");
        res.render("listUser", {
            users,
            user: req.session.user,
            messages: req.flash("error"),
            success: req.flash("success")
        });
    });
});

app.get('/addUser', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addUser', {
        user: req.session.user,
        messages: req.flash('error'),
        success: req.flash('success'),
        formData: req.flash('formData')[0] || {}
    });
});
app.post('/addUser', checkAuthenticated, checkAdmin, UserController.addUser);
app.get('/updateUser/:id', checkAuthenticated, checkAdmin, UserController.getUserById);
app.post('/updateUser/:id', checkAuthenticated, checkAdmin, UserController.updateUser);
app.get('/deleteUser/:id', checkAuthenticated, checkAdmin, UserController.deleteUser);

// --------------------
// CART ROUTES
// --------------------
app.get('/cart', checkAuthenticated, CartController.viewCart);
app.post('/cart/add/:id', checkAuthenticated, CartController.addToCart);
app.post('/cart/remove/:id', checkAuthenticated, CartController.removeFromCart);
app.post('/cart/clear', checkAuthenticated, CartController.clearCart);
app.post('/cart/updateQty/:id', checkAuthenticated, CartController.updateQuantity);

// --------------------
// CHECKOUT
// --------------------
app.get('/checkout', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    const selectedIds = req.query.ids;

    if (!selectedIds) {
        req.flash('error', 'Please select items to checkout.');
        return res.redirect('/cart');
    }

    const idsArray = Array.isArray(selectedIds)
        ? selectedIds.map(id => parseInt(id))
        : [parseInt(selectedIds)];

    const selectedItems = cart.filter(item => idsArray.includes(item.id));

    const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.render('checkout', {
        cart: selectedItems,
        total,
        ids: idsArray,
        user: req.session.user
    });
});

// 2FA
app.get("/verify-2fa", AuthController.show2FAPrompt);
app.post("/verify-2fa", AuthController.verifyLogin2FA);
app.get("/enable-2fa", checkAuthenticated, UserController.enable2FA);
app.post("/verify-enable-2fa", checkAuthenticated, UserController.verify2FA);

// ======================
// SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));