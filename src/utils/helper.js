// fetch data from URL
async function fetchESPNdata(url) {
    const espnRes = await fetch(url)
    const espnData = await espnRes.json()
    return espnData
}

// export functions
module.exports = {
    fetchESPNdata
}