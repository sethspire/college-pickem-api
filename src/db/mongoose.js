const mongoose = require('mongoose')
console.log(`Connecting to ${process.env.MONGODB_URL}`)
mongoose.set('strictQuery', true)
mongoose.connect(process.env.MONGODB_URL).catch((e) => {
    console.log(e)
})