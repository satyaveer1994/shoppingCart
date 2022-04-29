const cartModel = require('../Models/cartModel')
const productModel = require('../Models/productModel')
const userModel = require("../Models/userModel")
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

//---------------------------------------------------------------------------------------------------------------

let createCart = async function (req, res) {
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

    if (!isValidRequestBody(requestBody)) {
      return res.status(400).send({ status: false, message: "Enter cart details" });
    }

    const { cartId, productId } = requestBody;

    if (!isValid(productId)) {
      return res.status(400).send({ status: false, message: "enter the productId" });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: "enter a valid productId" });
    }

    const product = await productModel.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return res.status(404).send({ status: false, message: "product not found" });
    }

    if (!cartId) {
      const cartAlreadyPresent = await cartModel.findOne({ userId: userId });
      if (cartAlreadyPresent) {
        return res.status(404).send({ status: false, message: "cart already exist" });
      }
      newCart = {
        userId: userId,
        items: [{
          productId: productId,
          quantity: 1
        }],
        totalPrice: product.price,
        totalItems: 1,
      };

      newCart = await cartModel.create(newCart);

      return res.status(201).send({ status: "SUCCESS", message: "cart created successfully", data: newCart });
    }
    
    if (cartId) {
      if (!isValidObjectId(cartId)) {
        return res.status(400).send({ status: false, message: "enter a valid cartId" });
      }

      const cartAlreadyPresent = await cartModel.findOne({ _id: cartId, userId: userId });
      if (!cartAlreadyPresent) {
        return res.status(400).send({ status: false, message: "Cart does not exist" });
      }
      
      let totalPrice = product.price
      if (cartAlreadyPresent) {

        totalPrice += cartAlreadyPresent.totalPrice;

        let itemsArr = cartAlreadyPresent.items
        for (i in itemsArr) {
          if (itemsArr[i].productId.toString() === productId) {
            itemsArr[i].quantity += 1

            let updatedCart = { items: itemsArr, totalPrice: totalPrice, totalItems: itemsArr.length }

            let responseData = await cartModel.findOneAndUpdate({ userId: userId }, updatedCart, { new: true })

            return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
          }
        }
        itemsArr.push({ productId: productId, quantity: 1 })

        let updatedCart = { items: itemsArr, totalPrice: totalPrice, totalItems: itemsArr.length }
        let responseData = await cartModel.findOneAndUpdate({ userId: userId }, updatedCart, { new: true })

        return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
      }
    }
  }
  //}
  catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}

//---------------------------------------------------------------------------------------------------------------------


const updatedCart = async function (req, res) {
  try {
    let userId = req.params.userId
    const idFromToken = req.userId

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, msg: "userId is not a valid objectId" })
    }

    if (userId != idFromToken) {
      return res.status(403).send({ status: false, message: "User not authorized" })
    }

    let data = req.body
    const { cartId, productId, removeProduct } = data

    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, msg: "Enter value to be updating.." })
    }
    if (!isValid(cartId)) {
      return res.status(400).send({ status: false, msg: "cartId is required" })
    }
    if (!isValidObjectId(cartId)) {
      return res.status(400).send({ status: false, msg: "cartId is not a valid objectId" })
    }
    if (!isValid(productId)) {
      return res.status(400).send({ status: false, msg: "productId is required" })
    }
    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, msg: "productId is not a valid objectId" })
    }
    if (!(removeProduct == 0 || removeProduct == 1)) {
      return res.status(400).send({ status: false, msg: "removeProduct value should be either 0 or 1" })
    }

    const userDetails = await userModel.findOne({ _id: userId })
    if (!userDetails) {
      return res.status(404).send({ status: false, msg: "user not exist with this userId" })
    }
    const productDetails = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!productDetails) {
      return res.status(404).send({ status: false, msg: "product not exist or deleted" })
    }
    const cartDetails = await cartModel.findOne({ _id: cartId })
    if (!cartDetails) {
      return res.status(404).send({ status: false, msg: "cart not found" })
    }

    if (cartDetails.totalItems == 0) {
      return res.status(400).send({ status: false, message: "This cart is empty" })
    }

    if (removeProduct == 1) {
      for (let i = 0; i < cartDetails.items.length; i++) {
        if (cartDetails.items[i].productId == productId) {
          let newPrice = cartDetails.totalPrice - productDetails.price
          if (cartDetails.items[i].quantity > 1) {
            cartDetails.items[i].quantity -= 1
            let updateCartDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: cartDetails.items, totalPrice: newPrice }, { new: true })
            return res.status(200).send({ status: true, msg: "cart updated successfully", data: updateCartDetails })
          }
          else {
            totalItem = cartDetails.totalItems - 1
            cartDetails.items.splice(i, 1)

            let updatedDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: cartDetails.items, totalPrice: newPrice, totalItems: totalItem }, { new: true })
            return res.status(200).send({ status: true, msg: "cart removed successfully", data: updatedDetails })
          }
        }
      }
      return res.status(400).send({ status: true, msg: "This product not present in cart" })
    }

    if (removeProduct == 0) {
      for (let i = 0; i < cartDetails.items.length; i++) {
        if (cartDetails.items[i].productId == productId) {
          let newPrice = cartDetails.totalPrice - (productDetails.price * cartDetails.items[i].quantity)
          let totalItem = cartDetails.totalItems - 1
          cartDetails.items.splice(i, 1)
          let updatedCartDetails = await cartModel.findOneAndUpdate({ _id: cartId }, { items: cartDetails.items, totalItems: totalItem, totalPrice: newPrice }, { new: true })
          return res.status(200).send({ status: true, msg: "item removed successfully", data: updatedCartDetails })
        }
      }
      return res.status(400).send({ status: true, msg: "This product not present in cart" })
    }

  }
  catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}

//--------------------------------------------------------------------------------------------------------------------
const getCart = async function (req, res) {
  try {
    let userId = req.params.userId;
    let userIdfromToken = req.userId;

    if (!isValidObjectId(userId))
      return res.status(400).send({ status: false, message: "invalid userId" });

    let user = await userModel.findOne({ _id: userId });
    if (!user) {
      return res.status(404).send({ status: false, message: "no user found" });
    }

    if (userId != userIdfromToken) {
      return res.status(403).send({ status: false, message: "user is not authorized" });
    }

    let cart = await cartModel.findOne({ userId: userId });
    if (!cart) {
      return res.status(404).send({ status: false, message: "no cart found" });
    }
    return res.status(200).send({ status: true, message: "successfully found cart.", data: cart });

  }
  catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};


//-----------------------------------------------------------------------------------------------------------

const deleteCart = async (req, res) => {
  try {
    let userId = req.params.userId;
    let userIdfromToken = req.userId;

    if (!isValidObjectId(userId))
      return res.status(400).send({ status: false, message: "invalid userId" });

    let user = await userModel.findOne({ _id: userId });
    if (!user)
      return res.status(404).send({ status: false, message: "no user found" });

    if (userId !== userIdfromToken)
      return res.status(403).send({ status: false, message: "user is not authorized" });

    const findCart = await cartModel.findOne({ userId: userId });
    if (!findCart) {
      return res.status(400).send({ status: false, message: `${userId} has no cart`, });
    }
    if (findCart.totalItems == 0) {
      return res.status(400).send({ status: false, message: "There is no items to delete" })
    }

    let deleteChanges = await cartModel.findOneAndUpdate(
      { userId: userId },
      { $set: { items: [], totalPrice: 0, totalItems: 0 } },
      { new: true }
    );

    return res.status(200).send({ status: true, message: "Successfully remove items", data: deleteChanges });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};


module.exports = { createCart, updatedCart, getCart, deleteCart }