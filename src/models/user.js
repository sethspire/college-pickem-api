const mongoose = require('mongoose')
const validator = require('validator') // to validate email
const bcrypt = require('bcrypt') // to hash password
const jwt = require('jsonwebtoken') // to create web tokens
const Schema = mongoose.Schema

// set schema
const userSchema = new Schema({ 
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid.')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: 10
    },
    name: { 
        first: { 
            type: String,
            required: true,
            trim: true
        },
        last: { 
            type: String,
            required: true,
            trim: true
        }
    },
    loginTokens: [{
        token: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date
        }
    }],
    pwResetToken: {
        token: {
            type: String
        },
        timestamp: {
            type: Date
        } 
    }
})

// remove certain keys from the User object
userSchema.methods.toJSON = function() {
    const user = this
  
    const userObject = user.toObject()
  
    delete userObject.password
    delete userObject.__v
    delete userObject.loginTokens
    delete userObject.pwResetToken
  
    return userObject
}

// runs before User object is saved
userSchema.pre('save', async function(next) {
  
    const user = this
    
    // if new password, hashes password
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()  // run the save() method
})

// deletion of User, deletes all dependent objects
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const user = this

    //await mongoose.model('Contact').deleteMany({ owner: user._id })
    next()
})

// method to create an authorization token
userSchema.methods.generateAuthToken = async function () {
    const user = this

    // if already 3 tokens, remove oldest
    if (user.loginTokens.length >= 3) {
        user.loginTokens.shift()
    }

    // create web token of User id signed with secret key 
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JSON_WEB_TOKEN_SECRET)
    const timestamp = Date.now() // gets timestamp
    user.loginTokens = user.loginTokens.concat({ token, timestamp }) // add to User list of tokens
    await user.save()

    return token
}

// method to generate the token and timestamp for resetting password
userSchema.methods.generatePwResetAuthToken = async function() {
    const user = this

    // create web token of User id signed with secret key 
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JSON_WEB_TOKEN_SECRET)
    user.pwResetToken.token = token
    user.pwResetToken.timestamp = Date.now() // sets timestamp
    await user.save()

    return token
}

// method to find User by email and password
userSchema.statics.findByEmailPassword = async (email, password) => {      
    // finds User with matching email 
    const user = await User.findOne({email}) 
    if (!user) { 
        throw new Error('Unable to login') 
    } 

    // confirms password match
    const isMatch = await bcrypt.compare(password, user.password) 
    if (!isMatch) { 
        throw new Error('Unable to login') 
    } 

    return user 
}

// method to find User by email
userSchema.statics.findByEmail = async (email) => {  
    // finds User with matching email     
    const user = await User.findOne({email}) 

    return user 
}

//export User model
const User = mongoose.model('User', userSchema);
module.exports = User