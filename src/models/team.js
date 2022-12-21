const mongoose = require('mongoose')
const Schema = mongoose.Schema

const teamSchema = new Schema({
    name: {
        type: String
    },
    nickname: {
        type: String
    },
    abbr: {
        type: String,
        unique: true
    },
    espn_id: {
        type: String,
        unique: true
    },
    logoURL: {
        type: String,
        default: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Football_-_The_Noun_Project.svg/1000px-Football_-_The_Noun_Project.svg.png"
    },
    color: {
        type: String
    },
    conference: {
        name: {
            type: String
        },
        shortName: {
            type: String
        },
        abbr: {
            type: String
        },
        espn_id: {
            type: String
        },
        parentEspn_id: {
            type: String
        }
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
        }
    }
})

// remove certain keys from the Team object
teamSchema.methods.toJSON = function() {
    const team = this
  
    const teamObject = team.toObject()

    delete teamObject.__v
  
    return teamObject
}

//export Team model
const Team = mongoose.model('Team', teamSchema);
module.exports = Team