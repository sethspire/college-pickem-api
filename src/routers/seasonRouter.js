const express = require('express')
const Season = require('../models/season')
const espnQuery = require('../services/espnQuery')
const help = require('../utils/helper')

// create express router
const seasonRouter = new express.Router()

// UPDATE or INITIALIZE a Season
seasonRouter.post("/season/update", async (req, res) => {
    try {
        // only run if admin password is included
        if (help.adminAuth(req.body.adminPW)) {
            // if a season's year is included in the body, use that year, else use current year
            if (req.body.year) {
                season = await espnQuery.updateSeason(req.body.year)
            } else {
                season = await espnQuery.updateSeason(help.getCurrentSeason())
            }
        } else {
            throw "error starting season update"
        }

        res.status(200).send(season)
    } catch (e) {
        console.log(e)
        res.status(400).send(e)
    }
})

// GET a Season
seasonRouter.get("/season", async (req, res) => {
    try {
        // if year not in query, set to current season
        if (!req.query.year) {
            req.query.year = help.getCurrentSeason()
        }

        // use input query year to find Season and send if found, else throw error
        season = await Season.findOne({year: req.query.year})
        if (!season) {
            throw `season {${req.query.year}} not found`
        }
        res.status(200).send(season)
    } catch (e) {
        res.status(500).send(e)
    }
})

// export team router
module.exports = seasonRouter