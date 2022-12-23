const express = require('express')
const Game = require('../models/game')
const espnQuery = require('../services/espnQuery')
const help = require('../utils/helper')

// create express router
const gameRouter = new express.Router()

// UPDATE or INITIALIZE a week of games
gameRouter.post("/games/updateWeek", async (req, res) => {
    try {
        // update week of games if have admin authorization
        if (help.adminAuth(req.body.adminPW)) {
            // if no year or week given, get current year and week
            if (!req.body.year) {
                req.body.year = help.getCurrentSeason()
            }
            if (!req.body.week) {
                req.body.week = await help.getCurrentWeek()
                if (!req.body.week) {
                    throw "is no current week"
                }
            }
            // update games for said week
            espnQuery.updateGameWeek(req.body.year, req.body.week)
        } else {
            throw "error starting game week update"
        }
        
        res.status(200).send("update started, check logs for completion")
    } catch (e) {
        res.status(400).send(e)
    }
})

// UPDATE or INITIALIZE a single game

// GET a week of games

// GET a specific game

// export game router
module.exports = gameRouter