const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
var cors = require("cors");
var path = require("path");

const mongooseDriver = require("./database/databaseDriver.js");
const GameSteps = require("./enums/GameViewSteps");
const VotingCache = require("./VotingCache");

const Schema = mongoose.Schema;

const app = express();
app.use(bodyParser.json({ extended: true }));
app.use(express.static("public"));
app.use(cors());

const httpServer = http.createServer(app);
const io = socketIo(httpServer);

const port = process.env.PORT || "8000";

mongooseDriver.connect();

const votingCache = new VotingCache();

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/views/index.html"));
});

app.post("/createGame", function(req, res) {
  const player = new mongooseDriver.Player({
    ...mongooseDriver.blankPlayerTemplate,
    isHost: true,
    name: req.body.name
  });

  const game = new mongooseDriver.Game({
    ...mongooseDriver.blankGameTemplate,
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
        ...mongooseDriver.blankPlayerTemplate,
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

app.post("/joinGameInProgress", function(req, res) {
  mongooseDriver.Game.findById(req.body.gameId, (err, game) => {
    if (!game) {
      console.log("Did not find game!");
      return;
    }
    let foundPlayer = false;
    for (let i = 0; i < game.players.length; i++) {
      if (req.body.playerId == game.players[i]._id) {
        foundPlayer = true;
        break;
      }
    }
    if (!foundPlayer) {
      console.log("Did not find player!");
      return;
    }
    res.send({ gameId: game._id, playerId: req.body.playerId });
  });
});

function getNumTeamDarsh(numPlayers) {
  if (numPlayers % 2 === 0) {
    return numPlayers / 2 - 1;
  } else {
    return Math.floor(numPlayers / 2);
  }
}

function startGame(game) {
  const assignRole = (player, isTeamDarsh, isDarsh) => {
    player.isTeamDarsh = isTeamDarsh;
    player.isDarsh = isDarsh;
  };

  game.active = true;
  const numTeamDarsh = getNumTeamDarsh(game.players.length);

  game.president = game.players[0];
  game.president = game.players[0]._id;

  for (let i = 0; i < numTeamDarsh; i++) {
    if (i === 0) {
      assignRole(game.players[i], true, true);
    } else {
      assignRole(game.players[i], true, false);
    }
  }

  for (let i = 1; i < game.players.length; i++) {
    game.validChancellors.push(game.players[i]._id);
  }

  votingCache.createCacheForGame(game._id, game.players.length);
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
          startGame(game);

          game.save((err, game) => {
            console.log(game);
            io.sockets.in(game._id).emit("gameState", game);
          });
        }
      }
    });
  });

  socket.on("nominatingChancellor", function(data) {
    const { gameId, playerId, nominatedChancellorId } = data;

    mongooseDriver.Game.findById(gameId, (err, game) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!game) {
        console.log("No Game Found!");
        return;
      }

      if (game.currentStep !== GameSteps.NOMINATING_CHANCELLOR) {
        console.log("Game not accepting chancellor nominations");
        return;
      }

      if (game.president != playerId) {
        console.log("Player is not president");
        return;
      }

      if (!game.validChancellors.includes(nominatedChancellorId)) {
        console.log("Invalid chancellor selected");
      }

      votingCache.clearVotingCacheForGame(game._id);
      game.nominatedChancellor = nominatedChancellorId;
      game.currentStep = GameSteps.VOTING_ON_CHANCELLOR;

      game.save((err, game) => {
        if (err) {
          console.log(err);
        }
        io.sockets.in(game._id).emit("gameState", game);
      });
    });
  });

  socket.on("votingOnChancellor", function(data) {
    console.log("VOTING ON CHANCELLOR");
    const { gameId, playerId, vote } = data;
    if (vote === true) {
      if (!votingCache.voteYes(gameId, playerId)) {
        console.log("Error voting in game", gameId, "for player", playerId);
        return;
      }
    } else {
      if (!votingCache.voteNo(gameId, playerId)) {
        console.log("Error voting in game", gameId, "for player", playerId);
        return;
      }
    }

    if (votingCache.gameHasFinishedVotingSession(gameId)) {
      console.log("Voting done!");
      const voteResult = votingCache.getVoteResult(gameId);

      mongooseDriver.Game.findById(gameId, (err, game) => {
        if (err) {
          console.error(err);
          return;
        }

        if (!game) {
          console.log("No Game found!");
          return;
        }

        votingCache.clearVotingCacheForGame(game._id);

        game.chancellor = game.nominatedChancellor;
        game.nominatedChancellor = Schema.ObjectId("");
        game.currentStep = GameSteps.IN_SESSION;

        game.validChancellors = [];
        for (let i = 0; i < game.players.length; i++) {
          if (
            game.players[i] != game.president &&
            game.players[i] != game.chancellor
          ) {
            game.validChancellors.push(game.players[i]._id);
          }
        }

        game.save((err, game) => {
          if (err) {
            console.error(err);
            return;
          }
          io.sockets.in(game._id).emit("gameState", game);
        });
      });
    } else {
      console.log("Voting not done!...");
    }
  });

  const { gameId } = socket.handshake.query;

  mongooseDriver.Game.findOne({ _id: gameId }, (err, game) => {
    if (io.sockets.adapter.rooms[game._id]) {
      if (io.sockets.adapter.rooms[game._id].sockets[socket]) {
        console.log("Socket is already in game");
      } else {
        socket.join(game._id);
      }
    } else {
      socket.join(game._id);
    }
    io.sockets.in(game._id).emit("gameState", game);
  });
});

httpServer.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
