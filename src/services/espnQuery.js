const Team = require('../models/team')
const help = require('../utils/helper')

// EXPORT: update or create DI teams
async function updateTeams() {
    teamBeingChecked = ""
    try {
        // get list of team URLs for all DI
        const curDate = new Date()
        const curSeasonYear = curDate.getFullYear() - (curDate.getMonth() < 3) // January-March are still part of season designated by previous calender year value
        teamsResponseData = await help.fetchESPNdata(`https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${curSeasonYear}/types/2/groups/90/teams?limit=300`)
        teamsURLs = teamsResponseData.items

        // team by team
        teams = []
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
                    color: teamResponseData.color
                }

                // get conference
                if ('groups' in teamResponseData && '$ref' in teamResponseData.groups) {
                    conf = await getConference(teamResponseData.groups.$ref)
                    team.conference = conf
                } else {
                    console.log(teamBeingChecked + " has no group")
                }

                // check if team exists, if yes then update, else create new team
                teamInDB = await Team.findOne({espn_id: team.espn_id, abbr: team.abbr})
                if (!teamInDB) {
                    // team doesn't exist yet
                    createdTeam = new Team(team)
                    await createdTeam.save()
                    teams = teams.concat(createdTeam)
                } else {
                    // team already exists
                    const teamProperties = Object.keys(team)
                    changesMade = false
                    teamProperties.forEach((property) => {
                        if (teamInDB[property] !== team[property]) {
                            teamInDB[property] = team[property]
                            changesMade = true
                        }
                    })
                    if (changesMade) {
                        await teamInDB.save()
                    }
                }
            } catch (e) {
                console.log(`FAILED WITH TEAM (${teamBeingChecked})`, e)
            }
        }
        console.log("FINISHED UPDATING TEAMS")
    } catch (e) {
        console.log("FAILED TO UPDATE TEAMS:", e)
    }
}

// HELPER: get a team's conference
async function getConference(curConfURL) {
    // essentially just go up level till find conference
    foundConf = false
    while (!foundConf) {
        // fetch data and get parent ID
        confResponseData = await help.fetchESPNdata(curConfURL)
        parentURL = confResponseData.parent.$ref
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

// export modules
module.exports = {
    updateTeams
}