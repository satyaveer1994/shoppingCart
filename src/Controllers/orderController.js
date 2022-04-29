const orderModel = require('../Models/orderModel')
const userModel = require('../Models/userModel')
const cartModel = require('../Models/cartModel')
const mongoose = require('mongoose')

const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (ObjectId) {
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

//----------------------------------------------------------------------------------------------------------------------

let createOrder = async function (req, res) {
    try {
        const userId = req.params.userId;
        const idFromToken = req.userId

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Enter a valid userId" });
        }

        const user = await userModel.findOne({ _id: userId });
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }

        if (userId != idFromToken) {
            return res.status(403).send({ status: false, message: "User not authorized" })
        }

        const requestBody = req.body;
        const { cartId, cancellable, status } = requestBody;

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Enter cart details" });
        }

        if (!isValid(cartId)) {
            return res.status(400).send({ status: false, message: "Enter the cartId" });
        }

        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Enter a valid cartId" });
        }
        const cartAlreadyPresent = await cartModel.findOne({ _id: cartId });
        if (!cartAlreadyPresent) {
            return res.status(404).send({ status: false, message: "cart not found" });
        }

        if (cartAlreadyPresent.userId != userId) {
            return res.status(400).send({ status: false, message: "With this user cart is not created" });
        }

        if (cancellable) {
            if (!(typeof (cancellable) == 'boolean')) {
                return res.status(400).send({ status: false, message: "Cancellable must be a boolean value" });
            }
        }

        if (status) {
            if (['pending', 'completed', 'cancelled'].indexOf(status) == -1) {
                return res.status(400).send({ status: false, message: "Status sould be one of the pending, completed, cancelled" });
            }
        }
        if(!(cartAlreadyPresent.items.length)){
            return res.status(202).send({ status: true, message: "Order has been accepted,add more product in cart" });
        }
        let totalPrice = cartAlreadyPresent.totalPrice;
        let totalItems = cartAlreadyPresent.items.length
        let totalQuantity = 0

        let itemsArr = cartAlreadyPresent.items
        for (i in itemsArr) {
            totalQuantity += itemsArr[i].quantity
        }

        let newOrder = {
            userId: userId,
            items: cartAlreadyPresent.items,
            totalPrice: totalPrice,
            totalItems: totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status
        };

        orderData = await orderModel.create(newOrder);
        
        let removeFromCart = await cartModel.findOneAndUpdate(
            { userId: userId },
            { $set: { items: [], totalPrice: 0, totalItems: 0 } },
            { new: true }
          );
      
        return res.status(201).send({ status: true, message: "Order placed successfully", data: orderData });

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//----------------------------------------------------------------------------------------------------------------------

const updateOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const idFromToken = req.userId

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Enter a valid userId" });
        }

        const user = await userModel.findOne({ _id: userId });
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }

        if (userId != idFromToken) {
            return res.status(403).send({ status: false, message: "User not authorized" })
        }

        const data = req.body
        const { status, orderId } = data
        if (!isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "Enter data" });
        }

        if (!isValid(orderId)) {
            return res.status(400).send({ status: false, message: "Enter a orderId" });
        }

        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "Enter a valid orderId" });
        }

        const orderData = await orderModel.findOne({ _id: orderId, isDeleted: false });
        if (!orderData) {
            return res.status(404).send({ status: false, message: "order not found" });
        }
        if (orderData.userId != userId) {
            return res.status(400).send({ status: false, message: "This user not have any order" });
        }
        if (!isValid(status)) {
            return res.status(400).send({ status: false, message: "Enter a status" });
        }

        if (['pending', 'completed', 'cancelled'].indexOf(status) == -1) {
            return res.status(400).send({ status: false, message: "status sould be one of the pending, completed, cancelled" });
        }

        if (orderData.status == "completed") {
            return res.status(400).send({ status: false, message: "order is already get completed" });
        }

        if (orderData.status == "cancelled") {
            return res.status(400).send({ status: false, message: "order is already get cancelled" });
        }

        if (orderData.cancellable == true) {
            if (orderData.status == "pending") {
            let updatedData = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })
            return res.status(200).send({ status: false, message: "Order cancelled Successfully", data: updatedData });
        }
    }
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { createOrder, updateOrder }