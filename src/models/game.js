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
    week: {
        type: Number
    },
    year: {
        type: Number
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
        isNeutralSite: {
            type: Boolean
        }
    },
    network: {
        type: String
    },
    isCompleted: {
        type: Boolean
    },
    teams: [{
        team_id: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Team'
        },
        espn_id: {
            type: String
        },
        isHome: {
            type: Boolean
        },
        score: {
            type: Number
        },
        isWinner: {
            type: Boolean
        },
        rank: {
            type: Number
        },
        isRanked: {
            type: Boolean
        },
        spread: {
            type: Number
        },
        record: {
            type: String
        },
        winChance: {
            type: Number
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