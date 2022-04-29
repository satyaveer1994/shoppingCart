const express = require('express');
const router = express.Router();
const userController = require("../Controllers/userController")
const productController = require("../Controllers/productController")
const cartController = require("../Controllers/cartController")
const orderController = require("../Controllers/orderController")
const middleware = require('../Middelwars/auth')



//User
router.post("/register", userController.createUser);   //CreateUser

router.post("/login", userController.loginUser);   //LoginUser

router.get("/user/:userId/profile", middleware.authenticateUser, userController.getProfile);      //getProfile

router.put("/user/:userId/profile", middleware.authenticateUser, userController.updateProfile);    //updateProfile

//-------------------------------------------------------------------------------------------------------------------------

//Product
router.post("/products", productController.createProduct);

router.get("/products", productController.getProductsByfilter);

router.get("/products/:productId", productController.getProductsById);

router.put("/products/:productId", productController.updatedProducts);

router.delete("/products/:productId", productController.deleteProducts);

//-------------------------------------------------------------------------------------------------------------------

//Cart

router.post("/users/:userId/cart", middleware.authenticateUser, cartController.createCart);

router.put("/users/:userId/cart", middleware.authenticateUser, cartController.updatedCart);

router.get("/users/:userId/cart", middleware.authenticateUser, cartController.getCart);

router.delete("/users/:userId/cart", middleware.authenticateUser, cartController.deleteCart);

//-------------------------------------------------------------------------------------------------------------------


//Order

router.post("/users/:userId/orders", middleware.authenticateUser, orderController.createOrder);

router.put("/users/:userId/orders", middleware.authenticateUser, orderController.updateOrder);

module.exports = router;