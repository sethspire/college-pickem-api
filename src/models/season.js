const mongoose = require('mongoose')
const Schema = mongoose.Schema

const seasonSchema = new Schema({
    year: {
        type: Number,
        unique: true
    },
    numWeeks: {
        type: Number
    },
    weekDates: [
        {
            value: {
                type: Number
            },
            startDate: {
                type: String
            },
            endDate: {
                type: String
            }
        }
    ],

})

// remove certain keys from the Season object
seasonSchema.methods.toJSON = function() {
    const season = this
  
    const seasonObject = season.toObject()

    delete seasonObject.__v
  
    return seasonObject
}

//export Season model
const Season = mongoose.model('Season', seasonSchema);
module.exports = Season