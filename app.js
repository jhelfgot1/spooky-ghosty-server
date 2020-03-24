const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const express = require("express");
const http = require("http");

const mongooseDriver = require("./database/databaseDriver.js");

const app = express();
app.use(bodyParser.json({ extended: true }));

const httpServer = http.createServer(app);
const io = socketIo(httpServer);

const port = process.env.PORT || "8000";

const blankGameTemplate = {
  shortId: "",
  active: false,
  players: [],
  host: []
};

const blankPlayerTemplate = {
  isDevil: false,
  isEvil: false,
  isAlive: false,
  name: ""
};

mongooseDriver.connect();

app.post("/createGame", function(req, res) {
  const player = new mongooseDriver.Player({
    ...blankPlayerTemplate,
    name: req.body.name
  });

  const game = new mongooseDriver.Game({
    ...blankGameTemplate,
    host: player,
    players: [player],
    shortId: Math.random()
      .toString(36)
      .slice(6)
  });

  console.log(game.shortId);
  game.save((err, document) => {
    if (err) {
      console.log(err);
      next(err);
    } else {
      res.send(document);
    }
  });
});

app.post("/joinGame", function(req, res) {
  mongooseDriver.Game.findOne({ shortId: req.body.shortId }, (err, game) => {
    if (err) {
      console.log(err);
      next(err);
    } else {
      console.log("Found game!");

      game.players.push(
        new mongooseDriver.Player({
          ...blankPlayerTemplate,
          name: req.body.name
        })
      );

      game.save((err, document) => {
        if (err) {
          console.log(err);
          next(err);
        } else {
          res.send(document);
        }
      });
    }
  });
});

io.on("connection", function(socket) {
  console.log("A user Connected");
});

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
