const jwt = require("jsonwebtoken")



let authenticateUser = function (req, res, next) {
    try {
        token = req.headers["authorization"]
        if (!token) {
            return res.status(401).send({ status: false, message: "token required" })
        }
         if(token.startsWith('Bearer')){
             token=token.slice(7,token.length)
         }

        let decodedToken = jwt.verify(token, 'Secret-Key-given-by-us-to-secure-our-token')
        if (!decodedToken) {
            return res.status(401).send({ status: false, message: "token is invalid" })
        }
        req.userId=decodedToken.userId
        next()
    } catch (error) {
        res.status(500).send({ status: false, ERROR: error.message })
    }
}

module.exports.authenticateUser=authenticateUser