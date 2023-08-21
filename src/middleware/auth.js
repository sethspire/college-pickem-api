const jwt = require('jsonwebtoken')
const User = require('../models/user')

// confirm authorization before 
const auth = async (req, res, next) => {
    try {
        // gets token
        let token = req.header('Authorization')
        token = token.replace('Bearer ', '')

        // decodes token
        const decoded = jwt.verify(token, process.env.JSON_WEB_TOKEN_SECRET)

        // finds user with decoded _id and token
        const user = await User.findOne({_id: decoded._id, 'loginTokens.token': token})
        if (!user) {
            throw 'Invalid Token'
        }

        // confirm within 10 week time period
        usedToken = user.loginTokens.find(item => {
            return item.token == token
        })
        curDate = Date.now()
        diffMinutes = Math.round((curDate - usedToken.timestamp) / 60000)
        minIn1Month = 60*24*30 // min/hr * hr/day * day/month = min/month
        if (diffMinutes >= minIn1Month*10) {
            throw 'Token Timed Out'
        }

        // include token and user in req
        req.token = token
        req.user = user
        next()

    } catch (e) {
        res.status(401).send({"error": e})
    }
}

module.exports = auth