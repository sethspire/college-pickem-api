const express = require('express')
const User = require('../models/user')
// const { sendWelcomeEmail, sendPwResetEmail } = require('../emails/account.js')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')


// create express router
const userRouter = new express.Router()


// ADD A NEW USER
userRouter.post('/users', async (req, res) => {
    // check passwords match and remove retype
    if (req.body.password !== req.body.passwordRetype) {
        return res.status(400).send({ error: 'Passwords Must Match' , message: 'Passwords must match'})
    }
    delete req.body.passwordRetype

    // ensure email does not already exist
    const possibleUser = await User.findByEmail(req.body.email)
    if (possibleUser) {
        return res.status(400).send({ error: 'Email Already Exists' , message: 'Email already exists'})
    }

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

// LOGOUT A USER
userRouter.post('/users/logout', auth, async (req, res) => {
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

// LOGIN A USER
userRouter.post('/users/login', async (req, res) => {
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

// RETURN USER INFO
userRouter.get('/users/me', auth, async (req, res) => {
    // return User selected in auth middleware
    res.send(req.user)
})

// MODIFY USER INFO
userRouter.patch('/users/me', auth, async(req, res) => {
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

// DELETE USER
userRouter.delete('/users/me', auth, async (req, res) => {
    try {
        // try delete user
        await req.user.deleteOne()
        res.send(req.user)
    } 
    catch (e) {
        res.status(500).send()
    }
})

// SEND PASSWORD RESET EMAIL
userRouter.post('/users/pwReset', async (req, res) => {
    try {
        // find User by email
        const user = await User.findByEmail(req.body.email)

        if (user) {
            try {
                // generate pw reset token and reset URL
                const token = await user.generatePwResetAuthToken()
                //reset_url = "thebreadcrumbs.herokuapp.com/Forgotten_Login_Pages/password_pages/HTML/reset_password.html?pwResetToken=" + token
                //sendPwResetEmail(user.email, user.name, reset_url)
            }
            catch (e) {
                console.log(`ERROR SENDING USER PW RESET EMAIL for {${req.body.email}}: ${e}`)
            }
        } else {
            console.log(`ERROR SENDING USER PW RESET EMAIL for {${req.body.email}}: user does not exist`)
        }

        res.status(201).send()
    } 
    catch (e) {    
        res.status(400).send(e)
    }
})

// RESET PASSWORD
userRouter.patch('/users/pwReset', async (req, res) => {
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

        // change password and remove previous tokens
        user.password = req.body.password
        user.loginTokens = []
        user.pwResetToken = {}
        await user.save()

        // generate authorization token
        const token = await user.generateAuthToken()

        res.status(201).send({user, token})
    } 
    catch (e) {    
        res.status(400).send(e)
    }
})


// EXPORT ROUTER
module.exports = userRouter