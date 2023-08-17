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
gameRouter.post("/games/updateGame", async (req, res) => {
    try {
        // update game if have admin authorization
        if (help.adminAuth(req.body.adminPW)) {
            if (req.body.espn_id) {
                await espnQuery.updateGame({espn_id: req.body.espn_id})
            } else if (req.body._id) {
                await espnQuery.updateGame({_id: req.body._id})
            }
        } else {
            throw "error updating game"
        }

        res.status(200).send("single game update completed successfully")
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET a list of games
gameRouter.get("/games", async (req, res) => {
    try {
        // make sure only allowed queries are input
        allowedQueryKeys = ["_id", "espn_id", "venue.isNeutralSite", "network", "isCompleted", "week", "year", "teams.team_id", "teams.espn_id", "teams.rank", "teams.isRanked"]
        inputQueryKeys = Object.keys(req.query)
        inputQueryKeys.forEach(key => {
            if (!allowedQueryKeys.includes(key)) {
                throw `query key {${key}} not allowed`
            }
        })
        
        // use input query to find Games and send
        games = await Game.find(req.query)
        res.status(200).send(games)
    } catch (e) {
        res.status(500).send(e)
    }
})

// GET a specific game
gameRouter.get("/games/one", async (req, res) => {
    try {
        // make sure a query key referencing single Team is included and all queries are allowed
        singleGameKeys = ["_id", "espn_id"]
        allowedQueryKeys = ["_id", "espn_id", "venue.isNeutralSite", "network", "isCompleted", "week", "year", "teams.team_id", "teams.espn_id", "teams.rank", "teams.isRanked"]
        
        foundSingleGameKey = false
        inputQueryKeys = Object.keys(req.query)
        inputQueryKeys.forEach(key => {
            if (!allowedQueryKeys.includes(key)) {
                throw `query key {${key}} not allowed`
            }
            if (singleGameKeys.includes(key)) {
                foundSingleGameKey = true
            }
        })
        if (!foundSingleGameKey) {
            throw `must include single team key {${singleGameKeys}}`
        }

        // use input query to find Team and send if found, else throw error
        game = await Game.findOne(req.query)
        if (!game) {
            throw `game ${JSON.stringify(req.query)} not found`
        }
        res.status(200).send(game)
    } catch (e) {
        res.status(500).send(e)
    }
})

// export game router
module.exports = gameRouter