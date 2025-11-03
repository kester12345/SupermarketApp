// controllers/ProductController.js
const Product = require('../models/Product');

const ProductController = {
    // Admin view — Inventory list
    list: (req, res) => {
        Product.getAll((err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                return res.status(500).send('Error retrieving products');
            }
            res.render('inventory', { products, user: req.session.user });
        });
    },

    // Single product view
    getById: (req, res) => {
        const id = req.params.id;
        Product.getById(id, (err, product) => {
            if (err) {
                console.error('Error fetching product:', err);
                return res.status(500).send('Error retrieving product');
            }
            if (!product) return res.status(404).send('Product not found');
            res.render('product', { product, user: req.session.user });
        });
    },

    // Add product
    add: (req, res) => {
        const newProduct = {
            productName: req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            image: req.file ? req.file.filename : null
        };
        Product.add(newProduct, (err) => {
            if (err) {
                console.error('Error adding product:', err);
                return res.status(500).send('Error adding product');
            }
            res.redirect('/inventory');
        });
    },

    // Update product
    update: (req, res) => {
        const id = req.params.id;
        const updatedProduct = {
            productName: req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            image: req.file ? req.file.filename : req.body.currentImage
        };
        Product.update(id, updatedProduct, (err) => {
            if (err) {
                console.error('Error updating product:', err);
                return res.status(500).send('Error updating product');
            }
            res.redirect('/inventory');
        });
    },

    // Delete product
    delete: (req, res) => {
        const id = req.params.id;
        Product.delete(id, (err) => {
            if (err) {
                console.error('Error deleting product:', err);
                return res.status(500).send('Error deleting product');
            }
            res.redirect('/inventory');
        });
    }
};

module.exports = ProductController;


