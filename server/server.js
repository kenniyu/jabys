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
    $or: [{user: this.userId}]
  });
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
        playerCards;

    if (players.length < 4) {
      numCardsPerPerson = Jabys['CONSTANTS']['GAME']['DEALING']['LT_4_PLAYERS'];
    } else {
      numCardsPerPerson = Jabys['CONSTANTS']['GAME']['DEALING']['4_PLAYERS'];
    }

    for (var i = 0; i < numPlayers; i++) {
      playerId = players[i];
      playerCards = _.first(shuffledDeck, numCardsPerPerson);
      Meteor.call('createHand', playerId, gameId, playerCards);
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
      return Meteor.call('createGame', {
        players: room.allUsers,
        room: roomId
      });
    }
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
      discardPile: [],
      currentPile: [],
      places: []
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
      console.log('my user id = ' + Meteor.userId());
      console.log('i want ' + userId + ' hand ');
      console.log(hand);
      if (hand) {
        numCards = hand.cards.length;
        for (var i = 0; i < numCards; i++) {
          cards.push(Meteor.call('toCardObj', hand.cards[i]));
        }
      }
      return cards;
    }
  },

  toCardObj: function(cardStr) {
    var cardObj;
    if (cardStr.length === 3) {
      cardObj = {
        'label': cardStr,
        'index': 10,
        'value': 10,
        'suit': cardStr.substring(2)
      }
    } else {
      cardObj = {
        'label': cardStr,
        'index': cardStr.substring(0, 1),
        'value': cardStr.substring(0, 1),
        'suit': cardStr.substring(1)
      }
    }
    return cardObj;
  }


  /*
  start_new_game: function (evt) {
    /* create a new game w/ fresh board
    var game_id = Games.insert({board: new_board(), clock: 120});

    /* move everyone who is ready in the lobby to the game
    Players.update(
      {game_id: null, idle: false, name: {$ne: ''}},
      {$set: {game_id: game_id}},
      {multi: true}
    );

    /* Save a record of who is in the game, so when they leave we can
    *      still show them.
    var p = Players.find(
      {game_id: game_id},
      {fields: {_id: true, name: true}}
    ).fetch();
    Games.update(
      {_id: game_id},
      {$set: {players: p}}
    );


    /* wind down the game clock
    var clock = 120;
    var interval = Meteor.setInterval(function () {
      clock -= 1;
      Games.update(
        game_id,
       {$set: {clock: clock}}
      );

      /* end of game
      if (clock === 0) {
        /* stop the clock
        Meteor.clearInterval(interval);

        /* declare zero or more winners
        var scores = {};

        Words.find({game_id: game_id}).forEach(function (word) {
          if (!scores[word.player_id])
          scores[word.player_id] = 0;
          scores[word.player_id] += word.score;
        });

        var high_score = _.max(scores);
        var winners = [];

        _.each(scores, function (score, player_id) {
          if (score === high_score)
          winners.push(player_id);
        });

        Games.update(
          game_id,
          {$set: {winners: winners}}
        );
      }
    }, 1000);

    return game_id;
  },


  keepalive: function (player_id) {
    Players.update({_id: player_id},
    {$set: {last_keepalive: (new Date()).getTime(),
    idle: false}});
  }
 */
});


/*
Meteor.setInterval(function () {
var now = (new Date()).getTime();
var idle_threshold = now - 70*1000;
var remove_threshold = now - 60*60*1000;

Players.update({last_keepalive: {$lt: idle_threshold}},
{$set: {idle: true}});

/* XXX need to deal with people coming back!
*  Players.remove({$lt: {last_keepalive: remove_threshold}});

}, 30*1000);
*/

