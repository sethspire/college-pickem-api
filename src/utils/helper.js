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
    adminAuth
}