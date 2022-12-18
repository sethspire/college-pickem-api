const express = require('express')
const Team = require('../models/team')
const espnQuery = require('../services/espnQuery')

// create express router
const teamRouter = new express.Router()

// initialize or update teams list
teamRouter.post("/teams/update", async (req, res) => {
    try {
        if (req.body.adminPW === process.env.ADMIN_PASSKEY) {
            espnQuery.updateTeams()
        } else {
            throw "error starting update"
        }

        res.status(200).send("update started, check logs for completion")
    } catch (e) {
        res.status(400).send(e)
    }
})

// get list of team
teamRouter.get("/teams", async (req, res) => {
    try {
        // make sure only allowed queries are input
        allowedQueryKeys = ["_id", "name", "abbr", "espn_id", "nickname", "conference.name", "conference.shortName", "conference.abbr", "conference.espn_id", "conference.parentEspn_id"]
        inputQueryKeys = Object.keys(req.query)
        inputQueryKeys.forEach(key => {
            if (!allowedQueryKeys.includes(key)) {
                throw `query key {${key}} not allowed`
            }
        })
        
        // use input query to find Teams and send
        teams = await Team.find(req.query)
        res.status(200).send(teams)
    } catch (e) {
        res.status(500).send(e)
    }
})

// get singular team
teamRouter.get("/teams/one", async (req, res) => {
    try {
        // make sure a query key referencing single Team is included and all queries are allowed
        singleTeamKeys = ["_id", "name", "abbr", "espn_id", "nickname"]
        allowedQueryKeys = ["_id", "name", "abbr", "espn_id", "nickname", "conference.name", "conference.shortName", "conference.abbr", "conference.espn_id", "conference.parentEspn_id"]
        foundSingleTeamKey = false
        inputQueryKeys = Object.keys(req.query)
        inputQueryKeys.forEach(key => {
            if (!allowedQueryKeys.includes(key)) {
                throw `query key {${key}} not allowed`
            }
            if (singleTeamKeys.includes(key)) {
                foundSingleTeamKey = true
            }
        })
        if (!foundSingleTeamKey) {
            throw `must include single team key {${singleTeamKeys}}`
        }

        // use input query to find Teams and send
        team = await Team.findOne(req.query)
        res.status(200).send(team)
    } catch (e) {
        res.status(500).send(e)
    }
})

// export team router
module.exports = teamRouter