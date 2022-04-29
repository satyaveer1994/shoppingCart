const productModel = require('../Models/productModel')
const mongoose = require('mongoose')
let s3 = require('../S3/aws')
let curency = require('currency-symbol-map')

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

let isValidNumber = function (value) {
    if (!isNaN(value)) return true
}


//--------------------------------------------------------------------------------------------------------------

const createProduct = async (req, res) => {
    try {
        let data = req.body
        if (!isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "Please enter details of product" })
        }

        const { title, description, price, currencyId, isFreeShipping, availableSizes, style, installments } = data

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: "title is required" })
        }
        let uniqueTitle = await productModel.findOne({ title: title })
        if (uniqueTitle) {
            return res.status(400).send({ status: false, message: "Title already exists" })
        }

        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: "description is required" })
        }

        if (!isValid(price)) {
            return res.status(400).send({ status: false, message: "price is required" })
        }
        if (!isValidNumber(price)) {
            return res.status(400).send({ status: false, message: "price is should be a number" })
        }
        if (price <= 0) {
            return res.status(400).send({ status: false, message: "price greater than 0" })
        }

        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: "currencyId is required" })
        }
        if (!(currencyId == 'INR')) {
            return res.status(400).send({ status: false, message: "currencyId should be INR" })
        }

        if (!((isFreeShipping == 'true') || (isFreeShipping == 'false'))) {
            return res.status(400).send({ status: false, message: "isFreeShipping is boolean value" })
        }

        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await s3.uploadFile(files[0])
            data['productImage'] = uploadedFileURL
        }
        else {
            return res.status(400).send({ status: false, message: "productImage is required" })
        }

        let sizeArray = availableSizes.split(",").map(x => x.trim())
        for (let i = 0; i < sizeArray.length; i++) {
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizeArray[i]))) {
                return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
            }
        }
        if (!isValidNumber(installments)) {
            return res.status(400).send({ status: false, message: "Installment should be a number" })
        }


        let productData = {
            title,
            description,
            price,
            currencyId,
            currencyFormat: curency(currencyId),
            productImage: data.productImage,
            style,
            availableSizes: sizeArray,
            installments
        }

        let productDetails = await productModel.create(productData)
        return res.status(201).send({ status: true, message: "Success", data: productDetails })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//---------------------------------------------------------------------------------------------------------------------

let getProductsByfilter = async function (req, res) {
    try {
        const QueryParam = req.query
        const { size, name, priceGreaterThan, priceLesserThan, priceSort } = QueryParam

        if (!isValidRequestBody(QueryParam)) {
            const productsNotDeleted = await productModel.find({ isDeleted: false })
            return res.status(200).send({ status: true, data: productsNotDeleted })
        }

        const filter = { isDeleted: false }

        if (size) {
            let asize = size.split(",").map(x => x.trim())
            for (let i = 0; i < asize.length; i++) {
                if (["S", "XS", "M", "X", "L", "XXL", "XL"].includes(asize[i])) {
                    filter['availableSizes'] = asize
                }
            }
        }

        if (isValid(name)) {
            filter['title'] = {}
            filter['title']['$regex'] = name
            filter['title']['$options'] = '$i'
        }

        if (priceGreaterThan) {
            if (!isValidNumber(priceGreaterThan)) {
                return res.status(400).send({ status: false, message: "PriceGreaterThan must be a number " })
            }
            if (priceGreaterThan <= 0) {
                return res.status(400).send({ status: false, message: "PriceGreaterThan should be greter rhan 0" })
            }
            filter['price'] = { $gt: priceGreaterThan }
        }

        if (priceLesserThan) {
            if (!isValidNumber(priceLesserThan)) {
                return res.status(400).send({ status: false, message: "PriceLesserThan must be a number " })
            }
            if (priceLesserThan <= 0) {
                return res.status(400).send({ status: false, message: "priceLesserThan should be greter rhan 0" })
            }
            filter['price'] = { $lt: priceLesserThan }
        }

        if (priceGreaterThan && priceLesserThan) {

            filter['price'] = { $gt: priceGreaterThan, $lt: priceLesserThan }
        }

        if ("priceSort" in filter) {
            if (priceSort != 1 || priceSort != -1) {
                return res.status(400).send({ status: false, message: "You can sort price by using 1 and -1" })
            }

        }

        const productsData = await productModel.find(filter).sort({ price: priceSort })

        if (Array.isArray(productsData) && productsData.length == 0) {
            return res.status(400).send({ status: false, message: "No product Exist" })
        }
        return res.status(200).send({ status: true, message: 'product list', data: productsData })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//--------------------------------------------------------------------------------------------------------------------------

let getProductsById = async function (req, res) {
    try {
        let productId = req.params.productId

        if (!productId) { return res.status(400).send({ status: false, message: "productId required" }) }

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "productId not a valid ObjectId" })
        }

        let productData = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!productData) {
            return res.status(404).send({ status: false, message: "product not present in the collection" })
        }
        if (productData.isDeleted == true) {
            return res.status(400).send({ status: false, message: "product already Deleted" })
        }

        return res.status(200).send({ status: true, message: "Product details", data: productData })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


//============================================================================================================================


const updatedProducts = async function (req, res) {
    try {
        let productId = req.params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "UserId not a valid ObjectId" })
        }

        let productData = await productModel.findOne({ _id: productId })
        if (!productData) {
            return res.status(404).send({ status: false, message: "product not present in the collection" })
        }

        if (productData.isDeleted == true) {
            return res.status(400).send({ status: false, message: "product already Deleted" })
        }
        let data = req.body
        const { title, description, price, currencyId, availableSizes, style, installments } = data

        let updatedData = {}

        if (isValid(title)) {
            let uniqueTitle = await productModel.findOne({ title: title })
            if (uniqueTitle) {
                return res.status(400).send({ status: false, message: "Title already exists" })
            }
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['title'] = title
        }

        if (isValid(description)) {
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['description'] = description
        }

        if (isValid(price)) {
            if (!isValidNumber(price)) {
                return res.status(400).send({ status: false, message: "price is should be a number" })
            }
            if (price <= 0) {
                return res.status(400).send({ status: false, message: "price greater than 0" })
            }
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['price'] = price
        }


        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await s3.uploadFile(files[0])
            data['productImage'] = uploadedFileURL

            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['productImage'] = data.productImage
        } else {

            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['productImage'] = productData.productImage
        }

        if (isValid(currencyId)) {
            if (!(currencyId == 'INR')) {
                return res.status(400).send({ status: false, message: "currencyId should be INR" })
            }
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['currencyId'] = currencyId
        }

        if (isValid(availableSizes)) {
            let sizeArray = availableSizes.split(",").map(x => x.trim())
            for (let i = 0; i < sizeArray.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizeArray[i]))) {
                    return res.status(400).send({ status: false, message: `Available Sizes must be among ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
                }
            }
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$addToSet')) updatedData['$addToSet'] = {}

            if (Array.isArray(sizeArray)) {
                updatedData['$addToSet']['availableSizes'] = { $each: sizeArray }
            }
        }

        if (isValid(style)) {
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['style'] = style
        }

        if (isValid(installments)) {
            if (!isValidNumber(installments)) {
                return res.status(400).send({ status: false, message: "Installment should be a number" })
            }
            if (!Object.prototype.hasOwnProperty.call(updatedData, '$set')) updatedData['$set'] = {}
            updatedData['$set']['installments'] = installments
        }

        if (!isValidRequestBody(data) && !files) {
            return res.status(400).send({ status: true, message: "No data passed to modify" })
        }

        let updatedDetails = await productModel.findByIdAndUpdate(productId, updatedData, { new: true })
        return res.status(200).send({ status: true, message: "product updated", data: updatedDetails })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


//====================================================================================================================

let deleteProducts = async function (req, res) {
    try {
        let productId = req.params.productId

        if (!productId) { return res.status(400).send({ status: false, message: "productId required" }) }

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "productId not a valid ObjectId" })
        }

        let productData = await productModel.findOne({ _id: productId })
        if (!productData) {
            return res.status(404).send({ status: false, message: "product not present in the collection" })
        }
        if (productData.isDeleted == true) {
            return res.status(404).send({ status: false, message: "product  already Deleted" })
        }

        let deletedProductDetails = await productModel.findByIdAndUpdate(productId, { $set: { isDeleted: true, deletedAt: Date() } }, { new: true })
        return res.status(200).send({ status: true, message: "product deleted successfully", data: deletedProductDetails })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


module.exports = { createProduct, getProductsByfilter, getProductsById, updatedProducts, deleteProducts }