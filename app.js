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
  isDarsh: false,
  isTeamDarsh: false,
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
      if (!game) {
        console.log("Did not find game!");
        return;
      }
      console.log("Found game!");
      const newPlayer = new mongooseDriver.Player({
        ...blankPlayerTemplate,
        isHost: false,
        name: req.body.name
      });
      game.players.push(newPlayer);

      game.save((err, document) => {
        if (err) {
          console.log(err);
          next(err);
        } else {
          res.send({ gameId: document._id, playerId: newPlayer._id });
        }
      });
    }
  });
});

function getNumPlayersPerTeam(numPlayers) {
  if (numPlayers % 2 === 0) {
    return {
      numTeamDarsh: numPlayers / 2 - 1,
      numTeamHumanity: numPlayers / 2 + 1
    };
  } else {
    return {
      numTeamDarsh: Math.floor(numPlayers / 2),
      numTeamHumanity: Math.ciel(numPlayers / 2)
    };
  }
}

function startGame(game) {
  game.active = active;
  const { numFascists, numLiberals } = getNumPlayersPerTeam(
    game.players.length
  );

  //ToDO assign roles
}

io.on("connection", function(socket) {
  socket.on("startGame", function(socket) {
    mongooseDriver.Game.findOne({ _id: gameId }, (err, game) => {
      if (err) {
        console.log(err);
      } else {
        if (!game) {
          console.log("No Game Found");
        } else {
          game.active = true;

          game.save((err, game) => {
            io.sockets.in(game._id).emit("gameState", game);
          });
        }
      }
    });
  });

  const { gameId } = socket.handshake.query;

  mongooseDriver.Game.findOne({ _id: gameId }, (err, game) => {
    socket.join(game._id);
    io.sockets.in(game._id).emit("gameState", game);
  });
});

httpServer.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
