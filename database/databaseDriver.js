const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const GameSteps = require("../enums/GameViewSteps");
const mongoDBUrl = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0-fxgnm.mongodb.net/test?retryWrites=true&w=majority`;

//Schemas

const PlayerSchema = new Schema({
  name: String,
  isDarsh: Boolean,
  isTeamDarsh: Boolean,
  isAlive: Boolean,
  isHost: Boolean
});

const Player = mongoose.model("Player", PlayerSchema);

const GameSchema = new Schema({
  players: [PlayerSchema],
  host: PlayerSchema,
  nominatedChancellor: { type: Schema.ObjectId, ref: "Player" },
  chancellor: { type: Schema.ObjectId, ref: "Player" },
  president: { type: Schema.ObjectId, ref: "Player" },
  shortId: String,
  active: Boolean,
  currentStep: String,
  validChancellors: [{ type: Schema.ObjectId, ref: "Player" }]
});

const Game = mongoose.model("GameModel", GameSchema);

function connect() {
  mongoose.connect(mongoDBUrl, { useNewUrlParser: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error"));
  console.log("Connected to mongoDb...");
}

const blankGameTemplate = {
  voteYes: 0,
  voteNo: 0,
  president: Schema.ObjectId(""),
  chancellor: Schema.ObjectId(""),
  nominatedChancellor: Schema.ObjectId(""),
  shortId: "",
  active: false,
  players: [],
  host: {},
  validChancellors: [],
  currentStep: GameSteps.NOMINATING_CHANCELLOR
};

const blankPlayerTemplate = {
  isDarsh: false,
  isTeamDarsh: false,
  isAlive: true,
  votePending: false,
  name: ""
};

module.exports = {
  connect,
  Game,
  Player,
  blankGameTemplate,
  blankPlayerTemplate
};
