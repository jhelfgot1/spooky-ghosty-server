class VotingCacheElement {
  constructor(numPlayers) {
    this.yes = 0;
    this.no = 0;
    this.numPlayers = numPlayers;
    this.playersThatVoted = {};
  }

  voteYes(playerId) {
    if (this.playersThatVoted[playerId]) {
      return false;
    }
    this.yes = this.yes + 1;
    this.playersThatVoted[playerId] = true;
    return true;
  }

  voteNo(playerId) {
    if (this.playersThatVoted[playerId]) {
      return false;
    }
    this.no = this.no + 1;
    this.playersThatVoted[playerId] = true;
    return true;
  }

  hasCompleted() {
    return this.yes + this.no === this.numPlayers;
  }

  clear() {
    this.yes = 0;
    this.no = 0;
    this.playersThatVoted = {};
  }

  voteResult() {
    return this.yes > this.no;
  }
}

class VotingCache {
  constructor() {
    this.cache = {};
  }

  createCacheForGame(gameId, numPlayers) {
    this.cache[gameId] = new VotingCacheElement(numPlayers);
  }

  clearVotingCacheForGame(gameId) {
    if (!this.cache[gameId]) {
      console.log("No Game in voting cache with this id", gameId);
    }
    this.cache[gameId].clear();
  }

  gameHasFinishedVotingSession(gameId) {
    if (!this.cache[gameId]) {
      console.log("No Game in voting cache with this id", gameId);
    }
    return this.cache[gameId].hasCompleted();
  }

  voteYes(gameId, playerId) {
    if (!this.cache[gameId]) {
      console.log("No Game in voting cache with this id", gameId);
    }
    return this.cache[gameId].voteYes(playerId);
  }

  voteNo(gameId, playerId) {
    if (!this.cache[gameId]) {
      console.log("No Game in voting cache with this id", gameId);
    }
    return this.cache[gameId].voteNo(playerId);
  }

  getVoteResult(gameId) {
    if (!this.cache[gameId]) {
      console.log("No Game in voting cache with this id", gameId);
    }
    return this.cache[gameId].voteResult();
  }
}

module.exports = VotingCache;
