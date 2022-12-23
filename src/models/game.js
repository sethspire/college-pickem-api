const mongoose = require('mongoose')
const Schema = mongoose.Schema

const gameSchema = new Schema({
    espn_id: {
        type: String,
        unique: true,
        required: true
    },
    datetime: {
        type: Date
    },
    venue: {
        espn_id: {
            type: String
        },
        name: {
            type: String
        },
        address: {
            city: {
                type: String
            },
            state: {
                type: String
            }
        },
        isTrueHomeGame: {
            type: Boolean
        }
    },
    network: {
        type: String
    },
    status: {
        type: String
    },
    teams: [{
        team: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Team'
        },
        isHome: {
            type: Boolean
        },
        score: {
            type: Number
        },
        rank: {
            poll: {
                type: String
            },
            value: {
                type: Number
            }
        },
        spread: {
            type: String
        },
        record: {
            type: String
        },
        winChance: {
            type: String
        }
    }]
})

// remove certain keys from the Game object
gameSchema.methods.toJSON = function() {
    const game = this
  
    const gameObject = game.toObject()

    delete gameObject.__v
  
    return gameObject
}

//export Game model
const Game = mongoose.model('Game', gameSchema);
module.exports = Game