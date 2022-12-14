const Team = require('../models/team')
const Season = require('../models/season')
const Game = require('../models/game')
const help = require('../utils/helper')
const _ = require("lodash")

// EXPORT: update or create DI teams
async function updateTeams() {
    teamBeingChecked = ""
    try {
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
        // get dates for that week
        season = await Season.findOne({year: year})
        if (!season) {
            throw `season {${year}} does not exist`
        }
        week = (season.weekDates.filter(aWeek => aWeek.value == weekVal))[0]
        weekStart = week.startDate
        weekEnd = week.endDate
        
        // remove time and hyphens from times for YYYYMMDD format
        startYYYYMMDD = weekStart.split("T")[0].replaceAll("-", "")
        endYYYYMMDD = weekEnd.split("T")[0].replaceAll("-", "")
        
        // get list of games for the week for FBS (group 80)
        weekGames = await help.fetchESPNdata(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?&limit=200&groups=80&dates=${startYYYYMMDD}-${endYYYYMMDD}`)

        console.log(weekGames.events.length)
        console.log(`FINISHED UPDATING GAME WEEK {${year}, ${weekVal}}`)
    } catch (e) {
        console.log(`FAILED TO UPDATE GAME WEEK {${year}, ${weekVal}}`, e)
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

// export modules
module.exports = {
    updateTeams,
    updateSeason,
    updateGameWeek
}