// All Tomorrow's Parties -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1, cards: []}});
});

Meteor.publish("rooms", function () {
  return Rooms.find({});
});

Meteor.publish("messages", function () {
  return Messages.find({});
});

Meteor.publish("games", function () {
  return Games.find({});
});

Meteor.publish('hands', function() {
  return Hands.find({
    $or: [{'user': this.userId}]
  });
});

Meteor.publish('numCards', function() {
  return NumCards.find({});
});

Meteor.publish("gameScores", function () {
  return GameScores.find({});
});

var Jabys = {
  'CONSTANTS': {
    'GAME': {
      'DEALING': {
        '4_PLAYERS': 13,
        'LT_4_PLAYERS': 17
      }
    }
  }
}

Meteor.methods({
  dealHands: function(gameId) {
    var game = Games.findOne({'_id': gameId}),
        deck = ["AC", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C", "JC", "QC", "KC",
            "AD", "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "10D", "JD", "QD", "KD",
            "AH", "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "10H", "JH", "QH", "KH",
            "AS", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "10S", "JS", "QS", "KS"],
        shuffledDeck = _.shuffle(deck),
        players = game.players,
        numPlayers = players.length,
        numCardsPerPerson,
        playerId,
        playerCards,
        minCardValue = 99,
        minCardLabel,
        tempValue,
        startingPlayer;

    if (players.length < 4) {
      numCardsPerPerson = Jabys['CONSTANTS']['GAME']['DEALING']['LT_4_PLAYERS'];
    } else {
      numCardsPerPerson = Jabys['CONSTANTS']['GAME']['DEALING']['4_PLAYERS'];
    }

    for (var i = 0; i < numPlayers; i++) {
      playerId = players[i];

      playerCards = _.first(shuffledDeck, numCardsPerPerson);

      // create this players actual hand
      Meteor.call('createHand', playerId, gameId, playerCards, function(error, data) {
        // if hand contains lowest value so far,
        // record this user as the starting player
        for (var j = 0; j < playerCards.length; j++) {
          tempValue = getValue(playerCards[j], true);
          if (tempValue < minCardValue) {
            minCardLabel = playerCards[j];
            minCardValue = tempValue;
            startingPlayer = playerId;
          }
        }
        if (i === numPlayers - 1) {
          // set starting player
          Games.update({'_id': gameId}, {$set: {'currentPlayer': startingPlayer}});
        }
      });
      // create this players card count collection
      Meteor.call('createNumCards', playerId, gameId, playerCards.length, function(error, data) {
        console.log('done creating numcards for player ' + playerId);
      });
      shuffledDeck = _.difference(shuffledDeck, playerCards);
    }
  },

  startGame: function(roomId) {
    var room    = Rooms.findOne({'_id': roomId}),
        game,
        doCreateGame = false;

    if (room && room.ready === true) {
      Meteor.call('setRoomReady', roomId, false);

      // sanity check make sure a playing game doesn't exist
      // for this room already
      game = Games.findOne(
        { 'room': roomId, 'state': 'playing' }
      );
      if (!game) {
        // check passed, ok to create game
        doCreateGame = true;
      }
    }

    if (doCreateGame) {
      // create the game
      Meteor.call('createGame', {
        players: room.allUsers,
        room: roomId
      }, function(error, gameId) {
        if (! error) {
          // after game successfully starts, deal everyone their hands
          Meteor.call('dealHands', gameId);
          var game = Games.findOne({'_id': gameId}),
              players = game.players;

          // also create new score collections for this game's users
          _.each(players, function(userId) {
            Meteor.call('createGameScore', {
              user: userId,
              game: gameId
            });
          });
        }
      });
    }
  },

  createGameScore: function(options) {
    options = options || {};
    if (!options.game)
      throw new Meteor.Error(400, "Required parameter game missing");
    if (!options.user)
      throw new Meteor.Error(400, "Required parameter user missing");
    console.log('game score inserted');

    return GameScores.insert({
      user: options.user,
      game: options.game,
      score: 0,
      possessionStreak: 0,
      possessions: 0
    });
  },


  createGame: function(options) {
    options = options || {};
    if (!options.room)
      throw new Meteor.Error(400, "Required parameter room missing");
    if (!options.players)
      throw new Meteor.Error(400, "Required parameter room missing");

    return Games.insert({
      room: options.room,
      state: 'playing',
      players: options.players,
      currentPlayer: null,
      possessions: [],
      discardPile: [],
      currentPile: [],
      places: [],
      passedPlayers: [],
      turns: 0
    });
  },

  createHand: function(userId, gameId, cards) {
    return Hands.insert({
      'user': userId,
      'game': gameId,
      'cards': cards
    });
  },


  setRoomReady: function(roomId, state) {
    var room = Rooms.findOne({'_id': roomId});
    Rooms.update({'_id': roomId}, {$set: {'ready': state}});
  },

  getOthersHand: function(userId, gameId) {
    var hand,
        numCards,
        cards = [];

    // get the hand
    hand = Hands.findOne({'user': userId, 'game': gameId});
    if (hand) {
      numCards = hand.cards.length;
      for (var i = 0; i < numCards; i++) {
        cards.push({});
      }
    }
    return cards;
  },

  getHand: function(userId, gameId) {
    var hand,
        numCards,
        cards = [];

    if (userId !== Meteor.userId()) {
      // get the hand
      hand = Hands.findOne({'user': userId, 'game': gameId});
      if (hand) {
        numCards = hand.cards.length;
        for (var i = 0; i < numCards; i++) {
          cards.push({});
        }
      }
      return cards;
    } else {
      hand = Hands.findOne({'user': userId, 'game': gameId});
      if (hand) {
        numCards = hand.cards.length;
        for (var i = 0; i < numCards; i++) {
          cards.push(Meteor.call('toCardObj', hand.cards[i]));
        }
      }
      return cards;
    }
  },

  makePassMove: function(gameId) {
    var game = Games.findOne({'_id': gameId}),
        userId = Meteor.userId(),
        players, numPlayers,
        playerIndex, nextPlayerId,
        numTurns,
        passedPlayers, numPassedPlayers,
        currentPile;

    if (game) {
      gameId = game._id;
      if (game.currentPlayer === userId) {
        players = game.players;
        numPlayers = players.length;
        numTurns = game.turns;

        if (game.currentPile.length === 0)
          // cannot pass on first move of pile
          return;

        // pass player
        playerIndex = players.indexOf(userId);
        nextPlayerId = players[(playerIndex+1)%numPlayers];

        Games.update(
          {'_id': gameId},
          {$push: {'passedPlayers': userId}}
        );

        // refresh game object
        game = Games.findOne({'_id': gameId}),

        passedPlayers = game.passedPlayers;
        numPassedPlayers = passedPlayers.length;
        console.log('*****************');
        console.log(passedPlayers);
        console.log(numPassedPlayers);
        console.log(numPlayers);
        console.log('*****************');
        if (numPassedPlayers === numPlayers - 1) {
          // everyone passed, set currentPlayer to
          // the nonpassed player
          currentPile = game.currentPile;
          Games.update(
            {'_id': game._id},
            {$push: {'discardPile': currentPile}}
          );
          Games.update(
            {'_id': game._id},
            {$set: {
              'currentPile': [], 
              'currentPlayer': _.difference(game.players, passedPlayers)[0],
              'passedPlayers': [],
              'turns': numTurns + 1
            }}
          );
        } else {
          // find next player, set as currentPlayer
          Games.update(
            {'_id': gameId},
            {$set: {
              'currentPlayer': nextPlayerId,
              'turns': numTurns + 1
            }}
          );
        }
      }
    }
  },

  makeMove: function(gameId, hand) {
    console.log('making a move');
    var game = Games.findOne({'_id': gameId}),
        userId = Meteor.userId(),
        players, playerIndex, nextPlayerId, numPlayers,
        cards;

    if (!game)
      return false;

    // sort the hand first
    cards = hand.sort(cardSortFunction);


    // check hand against rules
    checkRules(game, cards);
  }
});


/* Game Logic */
var checkRules = function(game, cards) {
  var numTurns = game.turns,
      userId = Meteor.userId(),
      hand = Hands.findOne({'game': game._id, 'user': userId}),
      allCards,
      nextPlayerId, playerIndex, numPlayers,
      prevHand, compare,
      updateGame = false,
      gameScore, possessions, prevPossessor;

  /* Sanity check */
  if (!hand)
    return false;

  if (!cards || cards.length === 0)
    // a hand must be played
    return false;

  /* Pull some info from game */
  allCards = hand.cards;
  players = game.players;
  numPlayers = players.length;
  playerIndex = players.indexOf(userId);
  numTurns = game.turns;
  currentPile = game.currentPile;


  if (numTurns === 0) {
    // first player MUST make a move with the LOWEST card
    if (!_.contains(cards, getLowestCard(game)))
      return false;
  }

  // check that this hand is in the current players hand:
  if (_.intersection(allCards, cards).length !== cards.length)
    return false;

  // sanity check that the hand is valid
  if (!(isValidLength(cards) && isValidCombo(cards)))
    return false;

  if (currentPile.length === 0) {
    // empty current pile, can play any valid combo
    // valid combo, add to current pile
    updateGame = true;
  } else {
    // there was a hand played before this
    prevHand = _.last(currentPile);
    compare = compareToHand(prevHand, cards);
    if (compare)
      updateGame = true;
  }


  // update the game state, pull cards out of the players hand
  if (updateGame) {
    nextPlayerId = players[(playerIndex+1)%numPlayers];
    Games.update(
      {'_id': game._id},
      {$push: {'currentPile': cards}}
    );
    Games.update(
      {'_id': game._id},
      {$set: {'turns': numTurns + 1, 'passedPlayers': []}}
    );

    if (canPlayHigher(cards)) {
      Games.update(
        {'_id': game._id},
        {$set: {'currentPlayer': nextPlayerId}}
      );
    } else {
      // pass everyone, same player goes again
      // move currentPile to discardPile, empty current pile
      // possession gained by this player

      // refresh the game object
      game = Games.findOne({'_id': game._id});
      currentPile = game.currentPile;
      possessions = game.possessions;

      prevPossessor = _.last(possessions);
      Games.update(
        {'_id': game._id},
        {$push: {
          'discardPile': currentPile,
          'possessions': userId
        }}
      );
      Games.update(
        {'_id': game._id},
        {$set: {'currentPile': []}}
      );

      // refresh the game object
      game = Games.findOne({'_id': game._id});
      // update possession streak count
      if (prevPossessor && prevPossessor !== userId) {
        GameScores.update(
          {'user': prevPossessor, 'game': game._id},
          {$set: {possessionStreak: 0}}
        );
      }
      GameScores.update(
        {'user': userId, 'game': game._id},
        {$inc: {
          possessionStreak: 1,
          possessions: 1
        }}
      );
    }

    Hands.update(
      {'user': userId, 'game': game._id},
      {$pull: {'cards': {$in: cards}}}
    );
    hand = Hands.findOne({'game': game._id, 'user': userId});

    if (hand.cards.length === 0) {
      // this dude won, add his score
      Games.update(
        {'_id': game._id},
        {$push: {'places': userId}}
      );

      analyzeScore(userId, game._id);

      // check if we should end game
      game = Games.findOne({'_id': game._id});
      if (game.players.length - game.places.length === 1) {
        // everyone was placed except one person
        // game ends. loser gets nothing
        Games.update(
          {'_id': game._id},
          {$set: {'state': 'finished', 'currentPlayer': null}}
        );
      }
    }
  }
  return true;
};

var analyzeScore = function(userId, gameId) {
  var game = Games.findOne({'_id': gameId}),
      possessions,
      score = 0,
      streakCount = 0;

  if (game) {
    possessions = game.possessions;
    _.each(possessions, function(possessor) {
      if (possessor === userId) {
        streakCount += 1;
        score += streakCount;
      } else {
        streakCount = 0;
      }
    });
  }

  GameScores.update(
    {'user': userId, 'game': game._id},
    {$set: {'score': score}}
  );
};

var canPlayHigher = function(cards) {
  //can hand be beaten with a higher one?
  switch (cards.length) {
    case 1:
      if (getHandValue(cards) === 15)
        return false;
      break;
    case 2:
      if (getHandValue(cards) === 30)
        return false;
      break;
    case 5:
      if (isFourKind(cards) && getFourKindValue(cards) == 60)
        return false;
      break;
  }
  return true;
}

var isValidLength = function(cards) {
  var validLengths = [1,2,3,5];
  return _.contains(validLengths, cards.length);
}

var isValidCombo = function(cards) {
  var numCards = cards.length,
      isValid = false;

  switch (numCards) {
    case 1:
      isValid = true;
      break;
    case 2:
      var val1 = getValue(cards[0]);
      var val2 = getValue(cards[1]);
      isValid = (val1 === val2);
      break;
    case 5:
      isValid = (isStraight(cards) || isFullHouse(cards) || isFourKind(cards));
      break;
  }
  return isValid;
};



var getLowestCard = function(game) {
  var players = game.players,
      hands = Hands.find({'game': game._id}).fetch(),
      cards;

  cards = _.map(hands, function(handObj) { return handObj.cards; });
  cards = _.flatten(cards);
  return (cards.sort(cardSortFunction))[0];
}

/* Card Utility Functions */
var sortHand = function(hand) {
  var sortedHand = hand.sort(cardSortFunction);
  return sortedHand;
};

var cardSortFunction = function(card1, card2) {
  return (getValue(card1, true) - getValue(card2, true));
};

var getValue = function(cardLabel, suited) {
  var value, suit;
  if (cardLabel.length == 3) {
    value = 10;
    suit = cardLabel[2];
  } else {
    suit = cardLabel[1];
    switch (cardLabel[0]) {
      case '2':
        value = 15;
        break;
      case 'A':
        value = 14;
        break;
      case 'K':
        value = 13;
        break;
      case 'Q':
        value = 12;
        break;
      case 'J':
        value = 11;
        break;
      default:
        value = parseInt(cardLabel[0]);
        break;
    }
  }

  if (suited) {
    if (suit === 'C') {
      value += .1;
    } else if (suit === 'D') {
      value += .2;
    } else if (suit === 'H') {
      value += .3;
    } else if (suit === 'S') {
      value += .4;
    }
  }
  return value;
};

var isStraight = function(cards) {
  if ( (getValue(cards[0]) == getValue(cards[1]) - 1)
    && (getValue(cards[0]) == getValue(cards[2]) - 2)
    && (getValue(cards[0]) == getValue(cards[3]) - 3)
    && (getValue(cards[0]) == getValue(cards[4]) - 4) ) {
    return true;
  }
  // for A 2 3 4 5...
  // else if (getValue(hand[0]) == 3 && getValue(hand[1]) == 4 && getValue(hand[2]) == 5 && getValue(hand[3]) == 14 && getValue(hand[4]) == 15){
  //  return true;
  // }
  // for 2 3 4 5 6...
  // else if (getValue(hand[0]) == 3 && getValue(hand[1]) == 4 && getValue(hand[2]) == 5 && getValue(hand[3]) == 6 && getValue(hand[4]) == 15){
  //    return true;
  //  }
  //return false;
  //}
};

var isFullHouse = function(cards) {
  var cardHash = {},
      numKeys;

  cardHash = _.groupBy(cards, function(card) {
    return getValue(card);
  });
  numKeys = _.keys(cardHash);

  if (numKeys.length === 2) {
    if (_.values(cardHash)[0].length === 2 || _.values(cardHash)[0].length === 3) {
      return true;
    }
  }
  return false;
};

var isFourKind = function(cards) {
  var cardHash = {},
      numKeys;

  cardHash = _.groupBy(cards, function(card) {
    return getValue(card);
  });
  numKeys = _.keys(cardHash);

  if (numKeys.length === 2) {
    if (_.values(cardHash)[0].length === 1 || _.values(cardHash)[0].length === 4) {
      return true;
    }
  }
  return false;
};

var compareToHand = function(prevHand, newHand) {
  // check hands have equal length
  if (!isValidLength(newHand) || prevHand.length != newHand.length)
    return false;

  // then check values
  if (true) {//gameState["jackCounter"] == 0){
    if (getHandValue(newHand) > getHandValue(prevHand)) {
      return true;
    } else {
      return false;
    }
  }
  else {
    // there is a jack, so return 1 if the new hand is lower
    if (isFullHouse(prevHand)) {
      // must play a lower fullhouse
      if (isFullHouse(newHand) && (getHandValue(newHand) < getHandValue(prevHand))) {
        return true;
      } else {
        return false;
      }
    }
    else if (isFourKind(prevHand)) {
      if (isFourKind(newHand) && (getHandValue(newHand) < getHandValue(prevHand))) {
        return true;
      } else {
        return false;
      }
    }
    else {
      if (getHandValue(newHand) < getHandValue(prevHand)) {
        return true;
      } else{
        return false;
      }
    }
  }
};

var getHandValue = function(cards) {
  var sum = 0;
  switch (cards.length){
    case 1:
      sum = getValue(cards[0]);
      break;
    case 2:
      _.each(cards, function(card) {
        sum += getValue(card);
      });
      break;
    case 5:
      if (isStraight(cards)) {
        sum = getStraightValue(cards);
      }
      else if (isFullHouse(cards)) {
        sum = 100 + getTripletValue(cards);
      }
      else if (isFourKind(cards)) {
        sum = 1000 + getFourKindValue(cards);
      }
      break;
  }
  return sum;
};

var getStraightValue = function(cards) {
  var sum = 0;
  _.each(cards, function(card) {
    sum += getValue(card);
  });
  return sum;
};

var getTripletValue = function(cards) {
  var cardHash = {};

  cardHash = _.groupBy(cards, function(card) {
    return getValue(card);
  });
  for (var key in cardHash) {
    if (cardHash[key].length === 3) {
      return 3*key;
    }
  }
  return 0;
};

var getFourKindValue = function(cards) {
  var cardHash = {};

  cardHash = _.groupBy(cards, function(card) {
    return getValue(card);
  });
  for (var key in cardHash) {
    if (cardHash[key].length === 4) {
      return 4*key;
    }
  }
  return 0;
}
