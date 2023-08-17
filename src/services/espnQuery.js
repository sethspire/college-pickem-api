const Team = require('../models/team')
const Season = require('../models/season')
const Game = require('../models/game')
const help = require('../utils/helper')
const _ = require("lodash")



// EXPORT: update or create DI teams
async function updateTeams() {
    teamBeingChecked = ""
    try {
        console.log("STARTED UPDATING TEAMS")

        // get list of team URLs for all DI, both FBS(80) and FCS(81)
        const curSeasonYear = help.getCurrentSeason()
        //teamsResponseData = await help.fetchESPNdata(`https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${curSeasonYear}/types/2/groups/90/teams?limit=300`)
        fbsTeamsResponseData = await help.fetchESPNdata("https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams?group=80&limit=300")
        fcsTeamsResponseData = await help.fetchESPNdata("https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams?group=81&limit=300")
        teamsURLs = fbsTeamsResponseData.items.concat(fcsTeamsResponseData.items)
        
        // team by team
        for (i in teamsURLs) {
            try {
                //request team information from URL
                url = teamsURLs[i].$ref
                teamResponseData = await help.fetchESPNdata(url)
                teamBeingChecked = teamResponseData.nickname + " " + teamResponseData.name + "[" + teamResponseData.id + "]"

                // create JSON of needed parts of team
                team = {
                    name: teamResponseData.nickname,
                    nickname: teamResponseData.name,
                    abbr: teamResponseData.abbreviation,
                    espn_id: teamResponseData.id,
                    color: teamResponseData.color,
                }

                // get venue
                if (teamResponseData.venue) {
                    team.venue = {
                        espn_id: teamResponseData.venue.id,
                        name: teamResponseData.venue.fullName,
                        address: {
                            city: teamResponseData.venue.address.city,
                            state: teamResponseData.venue.address.state
                        }
                    }
                } else {
                    console.log(teamBeingChecked + " has no venue")
                }

                // get conference
                if ('groups' in teamResponseData && '$ref' in teamResponseData.groups) {
                    conf = await getConference(teamResponseData.groups.$ref)
                    team.conference = conf
                } else {
                    console.log(teamBeingChecked + " has no group")
                }

                // save team
                await saveTeam(team)
            } catch (e) {
                console.log(`FAILED WITH TEAM (${teamBeingChecked})`, e)
            }
        }
        console.log("FINISHED UPDATING TEAMS")
    } catch (e) {
        console.log("FAILED TO UPDATE TEAMS:", e)
    }
}

// EXPORT: update or create a Season
async function updateSeason(year) {
    // make sure year is within range 2000-current
    curYear = help.getCurrentSeason()
    if (year < 2000 || year > curYear) {
        throw `year not in range (2000-${curYear})`
    }

    // get list of weeks for that year
    seasonURL = `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${year}/types/2/weeks`
    seasonEspnData = await help.fetchESPNdata(seasonURL)

    // form season data
    season = {
        year: year,
        numWeeks: seasonEspnData.count,
        weekDates: []
    }
    
    // get dates for each week
    for (weekURL of seasonEspnData.items) {
        weekEspnData = await help.fetchESPNdata(weekURL.$ref)
        week = {
            value: weekEspnData.number,
            startDate: weekEspnData.startDate,
            endDate: weekEspnData.endDate
        }
        season.weekDates = season.weekDates.concat(week)
    }

    // save season
    return await saveSeason(season)
}

// EXPORT: update or create a week of Games
async function updateGameWeek(year, weekVal) {
    try {
        console.log(`STARTED UPDATING GAME WEEK {Y${year}, W${weekVal}}`)

        // get dates for that week
        season = await Season.findOne({year: year})
        if (!season) {
            throw `season {Y${year}} does not exist`
        }
        week = (season.weekDates.filter(aWeek => aWeek.value == weekVal))[0]
        weekStart = week.startDate
        weekEnd = week.endDate
        
        // remove time and hyphens from times for YYYYMMDD format
        startYYYYMMDD = weekStart.split("T")[0].replaceAll("-", "")
        endYYYYMMDD = weekEnd.split("T")[0].replaceAll("-", "")
        
        // get list of games for the week for FBS (group 80)
        weekGames = await help.fetchESPNdata(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?&limit=200&groups=80&dates=${startYYYYMMDD}-${endYYYYMMDD}`)

        // save each game
        errorsFound = 0
        for (const gameEvent of weekGames.events) {
            try {
                newGame = await getGame(gameEvent.id)
                await saveGame(newGame)
                // if (savedGame.espn_id === "401403877") {
                //     console.log(savedGame)
                // }
            } catch (e) {
                console.log(e)
                errorsFound++
            }
        }

        console.log(`FINISHED UPDATING GAME WEEK {Y${year}, W${weekVal}} {${errorsFound} error(s) in ${weekGames.events.length} games}`)
    } catch (e) {
        console.log(`FAILED TO UPDATE GAME WEEK {Y${year}, W${weekVal}}`, e)
    }
}

// EXPORT: update or create a single Game
async function updateGame({espn_id="", _id=""}) {
    if (espn_id.length > 0 && _id.length === 0) {
        newGame = await getGame(espn_id)
        await saveGame(newGame)
    }
    if (_id.length > 0 && espn_id.length === 0) {
        gameInDB = await Game.findOne({"_id": _id})
        newGame = await getGame(gameInDB.espn_id)
        await saveGame(newGame)
    }
}




// HELPER: get a team's conference for
async function getConference(curConfURL) {
    // essentially just go up level till find conference
    foundConf = false
    while (!foundConf) {
        // fetch data and get parent ID
        confResponseData = await help.fetchESPNdata(curConfURL)
        try {
            parentURL = confResponseData.parent.$ref
        } catch(e) {
            console.log("mess up with parent id")
            console.log("previous parentConfID: ", parentConfId)
            console.log(parentURL)
            throw "mess up with parent id"
        }
        urlArr = parentURL.split("/")
        parentConfId = urlArr[urlArr.length - 1].split("?")[0]

        // if parent has 80(FBS) / 81(FCS) / 90(DI) then reached conf
        if (["80", "81", "90"].includes(parentConfId)) {
            // select conference information
            conference = {
                espn_id: confResponseData.id,
                name: confResponseData.name,
                shortName: confResponseData.shortName,
                abbr: confResponseData.abbreviation,
                parentEspn_id: parentConfId
            }
            return conference
        } else {
            // change url to that of the parent conference
            curConfURL = confResponseData.parent.$ref
        }
    }
}

// HELPER: save team to db
async function saveTeam(team) {
    // check if team exists, if yes then update, else create new team
    teamInDB = await Team.findOne({espn_id: team.espn_id, abbr: team.abbr})
    if (!teamInDB) {
        // team doesn't exist yet
        createdTeam = new Team(team)
        await createdTeam.save()
    } else {
        // team already exists
        // because teamInDB is a Team object, can't directly compare it to a regular JSON object, so need to get the JSON
        teamInDB_json = teamInDB.toObject()

        // check if value of each key in new team req is same as that from DB, if not then change
        const teamProperties = Object.keys(team)
        changesMade = false
        teamProperties.forEach((property) => {
            if (!_.isEqual(teamInDB_json[property], team[property])) {
                teamInDB[property] = team[property]
                changesMade = true
            }
        })

        // save new team  only if changes have been made
        if (changesMade) {
            await teamInDB.save()
        }
    }
}

// HELPER: save season to db
async function saveSeason(season) {
    // check if season exists, if yes then update, else create new season
    seasonInDB = await Season.findOne({year: season.year})
    if (!seasonInDB) {
        // season doesn't exist yet
        createdSeason = new Season(season)
        await createdSeason.save()
        return createdSeason
    } else {
        // season already exists
        // need the JSON version to accurately compare to new data
        seasonInDB_json = seasonInDB.toObject()
        // remove the _id from each weekDates entry in the JSON of seasonInDB
        for (wk of seasonInDB_json.weekDates) {
            delete wk._id
        }

        // for each key in new season request, change value if different and track if changes made
        const seasonKeys = Object.keys(season)
        changesMade = false
        for (key of seasonKeys) {
            if (!_.isEqual(seasonInDB_json[key], season[key])) {
                seasonInDB[key] = season[key]
                changesMade = true
            }
        }

        // save and return
        if (changesMade) {
            await seasonInDB.save()
        }
        return seasonInDB
    }
}

// HELPER: get game and attributes to save
async function getGame(gameID) {
    gameEvent = await help.fetchESPNdata(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${gameID}`)

    // initialize game JSON
    game = {
        espn_id: gameID
    }

    // date and time, error if not found
    if (gameEvent.header.competitions.length > 0 && gameEvent.header.competitions[0].date) {
        game.datetime = gameEvent.header.competitions[0].date
    } else {
        throw new Error(`required datetime not found (${gameEvent.shortName})`)
    }

    // venue info, N/A if not found
    if (gameEvent.gameInfo.venue) {
        game.venue = {
            espn_id: gameEvent.gameInfo.venue.id,
            name: gameEvent.gameInfo.venue.fullName,
            address: {
                city: gameEvent.gameInfo.venue.address.city,
                state: gameEvent.gameInfo.venue.address.state
            }
        }    
    } else {
        game.venue = {
            espn_id: "N/A",
            name: "N/A",
            address: {
                city: "N/A",
                state: "N/A"
            }
        }  
    }

    // if is neutral site, false if not found
    if (gameEvent.header.competitions[0].neutralSite) {
        game.venue.isNeutralSite = gameEvent.header.competitions[0].neutralSite
    } else {
        game.venue.isNeutralSite = false
    }

    // broadcast station, N/A if not found
    if (gameEvent.header.competitions[0].broadcasts.length > 0 && gameEvent.header.competitions[0].broadcasts[0].media.shortName) {
        game.network = gameEvent.header.competitions[0].broadcasts[0].media.shortName
    } else {
        game.network = "N/A"
    }

    // game status, false if not found
    if (gameEvent.header.competitions[0].status.type.completed) {
        game.isCompleted = gameEvent.header.competitions[0].status.type.completed
    } else {
        game.isCompleted = false
    }

    // game week and year of season, 0 if not found
    if (gameEvent.header.week) {
        game.week = gameEvent.header.week
    }
    if (gameEvent.header.season) {
        game.year = gameEvent.header.season.year
    }

    // add both team's info, error if not 2 teams
    if (gameEvent.header.competitions[0].competitors.length === 2) {
        game.teams = []

        // await gameEvent.header.competitions[0].competitors.forEach(async (competitor) => {
        for (const competitor of gameEvent.header.competitions[0].competitors) {
            newTeam = {
                espn_id: competitor.id,
                isHome: competitor.homeAway === "home",
                score: competitor.score,
                isWinner: competitor.winner
            }

            // game spread
            if (gameEvent.pickcenter && gameEvent.pickcenter.length > 0) {
                spreadForHome = Number(gameEvent.pickcenter[0].spread)
                if (newTeam.isHome) {
                    newTeam.spread = spreadForHome
                } else {
                    newTeam.spread = -1*spreadForHome
                }
            } else {
                newTeam.spread = 9999
            }

            // win chance %
            if (gameEvent.predictor && gameEvent.predictor.homeTeam && gameEvent.predictor.awayTeam) {
                if (newTeam.isHome) {
                    newTeam.winChance = gameEvent.predictor.homeTeam.gameProjection
                } else {
                    newTeam.winChance = gameEvent.predictor.awayTeam.gameProjection
                }
            } else {
                newTeam.winChance = 9999
            }

            // team rank
            if (competitor.rank) {
                newTeam.rank = competitor.rank
            } else {
                newTeam.rank = 9999
            }

            // team isRanked
            if (newTeam.rank <= 25 && newTeam.rank >= 1) {
                newTeam.isRanked = true
            } else {
                newTeam.isRanked = false
            }

            // team record
            if (competitor.record.length > 0) {
                competitor.record.forEach(record => {
                    if (record.type === "total") {
                        newTeam.record = record.summary
                    }
                })
            } else {
                newTeam.record = "?-?"
            }

            // team id from database
            team = await Team.findOne({"espn_id": competitor.id})
            if (!team) {
                throw new Error(`team espn_id=${competitor.id} not found`)
            }
            newTeam.team_id = team._id

            // append new team to list
            game.teams.push(newTeam)
        }
    } else {
        throw new Error(`required 2 teams not found (${gameEvent.shortName})`)
    }

    return (game)
}

// HELPER: save game to db
async function saveGame(game) {
    // check if game exists, if yes then update, else create new game
    gameInDB = await Game.findOne({espn_id: game.espn_id})

    if (!gameInDB) {
        // game doesn't exist yet
        createdGame = new Game(game)
        await createdGame.save()
        return createdGame
    } else {
        // game already exists
        // need the JSON version to accurately compare to new data
        gameInDB_json = gameInDB.toObject()
        // remove the _id from each team entry in the JSON of gameInDB
        for (team of gameInDB_json.teams) {
            delete team._id
        }

        // for each key in new game request, change value if different and track if changes made
        const gameKeys = Object.keys(game)
        changesMade = false
        for (key of gameKeys) {
            if (!_.isEqual(gameInDB_json[key], game[key])) {
                gameInDB[key] = game[key]
                changesMade = true
            }
        }

        // save and return
        if (changesMade) {
            await gameInDB.save()
        }
        return gameInDB
    }
}



// export modules
module.exports = {
    updateTeams,
    updateSeason,
    updateGameWeek,
    updateGame
}