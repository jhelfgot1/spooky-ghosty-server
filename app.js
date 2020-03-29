const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const express = require("express");
const http = require("http");
var cors = require("cors");
var path = require("path");

const mongooseDriver = require("./database/databaseDriver.js");

const app = express();
app.use(bodyParser.json({ extended: true }));
app.use(express.static("public"));
app.use(cors());

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

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/views/index.html"));
});

app.post("/createGame", function(req, res) {
  const player = new mongooseDriver.Player({
    ...blankPlayerTemplate,
    isHost: true,
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
  game.save((err, document) => {
    if (err) {
      console.log(err);
      next(err);
    } else {
      console.log(document);
      res.send({ gameId: document._id, playerId: document.host._id });
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
          isHost: false,
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
  const { gameId, playerId } = socket.handshake.query;
  console.log(`${playerId} connecting to ${gameId}`);

  mongooseDriver.Game.findOne({ _id: gameId }, (err, game) => {
    console.log(game.players[0].name);
    if (game.host._id == playerId) {
      console.log("Host Connected To Socket!");
      socket.join(game._id);
      io.sockets.in(game._id).emit("gameState", game);
    } else {
      console.log("Non host joining!");
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
