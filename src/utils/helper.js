const Season = require('../models/season')

// fetch data from espn URL
async function fetchESPNdata(url) {
    const espnRes = await fetch(url)
    const espnData = await espnRes.json()
    return espnData
}

// get year of current season
function getCurrentSeason() {
    // January-March are still part of season imo, so April,2020-March,2021 is 2020 season
    const curDate = new Date()
    const curSeasonYear = curDate.getFullYear() - (curDate.getMonth() < 3)
    return curSeasonYear
}

// get current week of season if applicable
async function getCurrentWeek() {
    curYear = getCurrentSeason()

    // use current year to find current season if it exists
    curSeason = await Season.findOne({year: curYear})
    if (!curSeason) {
        throw "no current season"
    }

    curDate = new Date()
    // find first week in which the time falls
    for (week of curSeason.weekDates) {
        weekStart = new Date(week.startDate)
        weekEnd = new Date(week.endDate)
        // return week if is between week start and end
        if (weekStart < curDate && curDate < weekEnd) {
            return week.value
        }
    }
    return null
}

// confirm admin login
function adminAuth(adminPW) {
    if (adminPW === process.env.ADMIN_PASSKEY) {
        return true
    } else {
        return false
    }
}

// export functions
module.exports = {
    fetchESPNdata,
    getCurrentSeason,
    adminAuth,
    getCurrentWeek
}