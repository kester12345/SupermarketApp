// app.js
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
const db = require('./db');
const sha1 = require('sha1')

// Import controllers
const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CartController = require('./controllers/CartController'); 
const OrderController = require('./controllers/OrderController');
const AuthController = require('./controllers/AuthController');
const User = require('./models/User');


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// View engine setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// Session & Flash middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));
app.use(flash());

// Middleware: Check if user is authenticated
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware: Check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// ===============================
// ROUTES
// ===============================

// Home
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// ----------- USER ROUTES -----------
app.get('/register', (req, res) => {
    res.render('register', { 
        messages: req.flash('error'), 
        formData: req.flash('formData')[0] 
    });
});
app.post('/register', AuthController.register);

app.get('/login', (req, res) => {
    res.render('login', { 
        messages: req.flash('success'), 
        errors: req.flash('error') 
    });
});
// ⭐ UPDATED: login handled by AuthController
app.post('/login', AuthController.login);

// ⭐ UPDATED: logout handled by AuthController
app.get('/logout', AuthController.logout);

// ⭐ USER — View own order history
app.get('/my-orders', checkAuthenticated, OrderController.viewUserOrders);

// ----------- PRODUCT ROUTES -----------

// Inventory (Admin)
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.list);

// Shopping (User)
app.get('/shopping', checkAuthenticated, ProductController.shopping);

// Product details
app.get('/product/:id', checkAuthenticated, ProductController.getById);

// Add product form
app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});

// Add product
app.post('/addProduct', upload.single('image'), ProductController.add);

// Update product form
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const Product = require('./models/Product');
    const id = req.params.id;

    Product.getById(id, (err, product) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).send('Error retrieving product');
        }
        if (!product) return res.status(404).send('Product not found');
        res.render('updateProduct', { product, user: req.session.user});
    });
});

// Update product
app.post('/updateProduct/:id', upload.single('image'), ProductController.update);

// Delete product
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.delete);

// ----------- ADMIN USER MANAGEMENT ROUTES -----------

// ----------- ADMIN DASHBOARD -----------
app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('admin', { user: req.session.user });
});

// ✅ Admin: List all users
app.get('/listUser', checkAuthenticated, checkAdmin, (req, res) => {
  const db = require('./db');
  db.query('SELECT * FROM users', (err, users) => {
    if (err) return res.status(500).send('Error retrieving users');
    res.render('listUser', {
      users,
      user: req.session.user,
      messages: req.flash('error'),
      success: req.flash('success')
    });
  });
});

// ✅ Admin: Add user form
app.get('/addUser', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('addUser', {
    user: req.session.user,
    messages: req.flash('error'),    // <-- pass error messages
    success: req.flash('success'),   // <-- pass success messages
    formData: req.flash('formData')[0] || {}
  });
});

// ✅ Admin: Add user (form submission)
app.post('/addUser', checkAuthenticated, checkAdmin, UserController.addUser);

// ✅ Admin: Edit user form
app.get('/updateUser/:id', checkAuthenticated, checkAdmin, UserController.getUserById);

// ✅ Admin: Update user
app.post('/updateUser/:id', checkAuthenticated, checkAdmin, UserController.updateUser);

// Admin: delete user
app.get('/deleteUser/:id', checkAuthenticated, checkAdmin, UserController.deleteUser);

// ORDER HISTORY (ADMIN)
app.get('/admin/orders', checkAuthenticated, checkAdmin, OrderController.viewAllOrders);
app.get('/admin/orders/:id', checkAuthenticated, checkAdmin, OrderController.viewOrderDetails);

// ----------- CART ROUTES (CORRECTED) -----------

app.get('/cart', checkAuthenticated, CartController.viewCart);

app.post('/cart/add/:id', checkAuthenticated, CartController.addToCart);

app.post('/cart/remove/:id', checkAuthenticated, CartController.removeFromCart);

app.post('/cart/clear', checkAuthenticated, CartController.clearCart);

app.post('/cart/updateQty/:id', checkAuthenticated, CartController.updateQuantity);


// ===============================
// Checkout Page (GET)
// ===============================
app.get('/checkout', checkAuthenticated, (req, res) => {

  // Retrieve session cart (or empty array if none)
  const cart = req.session.cart || [];

  // Retrieve selected item IDs from the query string (?ids=1&ids=2)
  const selectedIds = req.query.ids;

  // If no IDs were selected in cart.ejs, send user back
  if (!selectedIds) {
    req.flash('error', 'Please select items to checkout.');
    return res.redirect('/cart');
  }

  // Convert selectedIds into an array of integers
  // (whether it's one ID or multiple IDs)
  const idsArray = Array.isArray(selectedIds)
    ? selectedIds.map(id => parseInt(id))   // multiple checkboxes
    : [parseInt(selectedIds)];             // single checkbox

  // Filter only the selected products from the session cart
  const selectedItems = cart.filter(item => idsArray.includes(item.id));

  // Recalculate total only for selected items
  const total = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Render checkout.ejs and pass:
  // - selected items only
  // - total price
  // - the IDs again (for POST checkout)
  // - logged-in user
  res.render('checkout', {
    cart: selectedItems,
    total,
    ids: idsArray,
    user: req.session.user
  });
});


// Checkout confirm - POST
app.post('/checkout', checkAuthenticated, OrderController.checkoutSelected);


// ----------- 2FA ROUTES -----------

app.get("/verify-2fa", AuthController.show2FAPrompt);
app.post("/verify-2fa", AuthController.verifyLogin2FA);

app.get("/enable-2fa", checkAuthenticated, UserController.enable2FA);
app.post("/verify-enable-2fa", checkAuthenticated, UserController.verify2FA);

// ===============================
// SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));