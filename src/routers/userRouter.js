const express = require('express')
const User = require('../models/user')
// const { sendWelcomeEmail, sendPwResetEmail } = require('../emails/account.js')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')

const router = new express.Router()

// Add a new user
router.post('/users', async (req, res) => {
    // check passwords match and remove retype
    if (req.body.password !== req.body.passwordRetype) {
        return res.status(400).send({ error: 'Passwords Must Match' , message: 'Passwords must match'})
    }
    delete req.body.passwordRetype

    try {
        // save user
        const user = new User(req.body)
        await user.save()

        // generate authorization token
        const token = await user.generateAuthToken()

        res.status(201).send({user, token})
    } 
    catch(error) {
        res.status(400).send(error)
    }
})

// Logout a user
router.post('/users/logout', auth, async (req, res) => {
    try {
        // remove current loginToken from token list
        req.user.loginTokens = req.user.loginTokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        
        res.send()
    }
    catch (e) {
        res.status(500).send()
    }
})

// login a user
router.post('/users/login', async (req, res) => {
    try {
        // find user with matching email and password
        const user = await User.findByEmailPassword(req.body.email, req.body.password)

        // generate authorization token
        const token = await user.generateAuthToken()
        res.status(200).send({user, token})
    } 
    catch (e) {    
        res.status(400).send(e)
    }
})

// return user info
router.get('/users/me', auth, async (req, res) => {
    // return User selected in auth middleware
    res.send(req.user)
})

// modify user information
router.patch('/users/me', auth, async(req, res) => {
    // get list of modifications to make to User
    const mods = req.body
    const properties = Object.keys(mods)

    // make sure only properties allowed to be modified actually are
    const modifiable = ['name']
    const isValid = properties.every((property) => modifiable.includes(property))
    if (!isValid) {
        return res.status(400).send({ error: 'Invalid updates.' })
    }

    try {
        // update modified User properties
        const user = req.user
        properties.forEach((property) => user[property] = mods[property])
        await user.save()
        res.send(user)
    } catch (e) {
        res.status(400).send()
    }
})

// delete user
router.delete('/users/me', auth, async (req, res) => {
    try {
        // try delete user
        await req.user.deleteOne()
        res.send(req.user)
    } 
    catch (e) {
        res.status(500).send()
    }
})

// send password reset email
router.post('/users/pwReset', async (req, res) => {
    try {
        // find User by email
        const user = await User.findByEmail(req.body.email)

        // generate pw reset token and reset URL
        const token = await user.generatePwResetAuthToken()
        //reset_url = "thebreadcrumbs.herokuapp.com/Forgotten_Login_Pages/password_pages/HTML/reset_password.html?pwResetToken=" + token
        //sendPwResetEmail(user.email, user.name, reset_url)
        res.status(201).send()
    } 
    catch (e) {    
        res.status(400).send(e)
    }
})

// reset password
router.patch('/users/pwReset', async (req, res) => {
    try {
        // confirm identical passwords
        if (req.body.password !== req.body.passwordRetype) {
            throw new Error('Passwords Must Match')
        }

        // confirm pw reset token
        const decoded = jwt.verify(req.body.pwResetToken, process.env.JSON_WEB_TOKEN_SECRET)
        const user = await User.findOne({_id: decoded._id, email: req.body.email, "pwResetToken.token": req.body.pwResetToken})
        if (!user) {
            throw new Error('token issue')
        }

        // confirm its been less than 15 minutes
        curDate = Date.now()
        resetCreationDate = user.pwResetToken.timestamp
        diffMinutes = Math.round((curDate - resetCreationDate) / 60000)
        if (diffMinutes >= 15) {
            throw new Error('URL Timed Out')
        }

        // change password
        user.password = req.body.password
        await user.save()

        res.status(200).send(user)
    } 
    catch (e) {    
        res.status(400).send(e)
    }
})

module.exports = router