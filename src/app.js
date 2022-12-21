const express = require('express')
const cors = require('cors');
require('./db/mongoose')

const app = express()
app.use(express.json())

// pretty sure this is magic that makes the whole thing possible
app.use(cors())
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// use routers
app.use(require('./routers/userRouter'))
app.use(require("./routers/teamRouter"))
app.use(require("./routers/seasonRouter"))
//app.use(require("./routers/gameRouter"))

// listen on port
const port = process.env.PORT
app.listen(port, () => {
    console.log('API service is up on port ' + port)
})