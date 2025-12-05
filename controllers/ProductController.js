// controllers/ProductController.js
const Product = require('../models/Product');
    // Admin view — Inventory list 
    const ProductController = {
        list: (req, res) => { 
            let { search, filter, category, sort } = req.query;

            Product.getAll((err, products) => { 
                if (err) {
                    console.error('Error fetching products:', err); 
                    return res.status(500).send('Error retrieving products'); 
                }

                // SEARCH BY NAME
                if (search) {
                    products = products.filter(p =>
                        p.productName.toLowerCase().includes(search.toLowerCase())
                    );
                }

                // STOCK FILTER
                if (filter === 'in') {
                    products = products.filter(p => p.quantity > 0);
                } else if (filter === 'out') {
                    products = products.filter(p => p.quantity === 0);
                }

                // CATEGORY FILTER
                if (category) {
                    products = products.filter(p => p.category === category);
                }

                // SORT BY PRICE
                if (sort === 'low') {
                    products.sort((a, b) => a.price - b.price);
                } else if (sort === 'high') {
                    products.sort((a, b) => b.price - a.price);
                }

                res.render('inventory', { 
                    products, 
                    user: req.session.user,

                    // Pass values to EJS
                    search,
                    filter,
                    category,
                    sort
                });
            });
        },

        // Shopping view — Product catalog with search, filter, sort
        shopping: (req, res) => {
            let { search, filter, category, sort } = req.query;

            Product.getAll((err, products) => {
                if (err) return res.status(500).send("Error retrieving products");

                // Search
                if (search) {
                    products = products.filter(p =>
                        p.productName.toLowerCase().includes(search.toLowerCase())
                    );
                }

                // Stock filter
                if (filter === 'in') {
                    products = products.filter(p => p.quantity > 0);
                } else if (filter === 'out') {
                    products = products.filter(p => p.quantity === 0);
                }

                // Category filter
                if (category) {
                    products = products.filter(p => p.category === category);
                }

                // Sorting
                if (sort === 'low') {
                    products.sort((a, b) => a.price - b.price);
                } else if (sort === 'high') {
                    products.sort((a, b) => b.price - a.price);
                }

                res.render('shopping', { 
                    products, 
                    user: req.session.user,
                    search,
                    filter,
                    category,
                    sort
                });
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
                category: req.body.category,
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
                category: req.body.category,
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
        },
};

module.exports = ProductController;