const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mongoDBUrl = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0-fxgnm.mongodb.net/test?retryWrites=true&w=majority`;

//Schemas

const PlayerSchema = new Schema({
  name: String,
  isDevil: Boolean,
  isEvil: Boolean,
  isAlive: Boolean
});

const Player = mongoose.model("Player", PlayerSchema);

const GameSchema = new Schema({
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player"
    }
  ],
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player"
  },
  shortId: String,
  active: Boolean
});

const Game = mongoose.model("GameModel", GameSchema);

function connect() {
  mongoose.connect(mongoDBUrl, { useNewUrlParser: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error"));
  console.log("Connected to mongoDb...");
}

module.exports = { connect, Game, Player };
