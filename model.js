// All Tomorrow's Parties -- data model
// Loaded on both the client and the server

///////////////////////////////////////////////////////////////////////////////
// Parties

/*
  Each party is represented by a document in the Parties collection:
    owner: user id
    public: Boolean
    invited: Array of user id's that are invited (only if !public)
    rsvps: Array of objects like {user: userId, rsvp: "yes"} (or "no"/"maybe")
*/
Rooms = new Meteor.Collection("rooms");
Messages = new Meteor.Collection("messages");
Games = new Meteor.Collection("games");
GameHistory = new Meteor.Collection("gameHistory");
Hands = new Meteor.Collection("hands");
NumCards = new Meteor.Collection("numCards");
GameScores = new Meteor.Collection("gameScores");

Messages.allow({
  insert: function (userId, room, message) {
    return false;
  }
});

Rooms.allow({
  insert: function (userId, room) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, room, fields) {
    /*
    if (userId !== room.owner)
      return false; // not the owner

    var allowed = ["title", "description"];
    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field
     */

    // A good improvement would be to validate the type of the new
    // value of the field (and if a string, the length.) In the
    // future Meteor will have a schema system to makes that easier.
    return true;
  },
  remove: function (userId, room) {
    // You can only remove rooms that you created
    return room.owner === userId;
  }
});

Games.allow({
  insert: function (userId, game) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, game, room, fields) {
    // no user can update game state
    return false;
  },
  remove: function (userId, game) {
    // No cowboy removes
    return false;
  }
});

GameHistory.allow({
  insert: function (userId, game) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, game, room, fields) {
    // cannot update history
    return true;
  },
  remove: function (userId, game) {
    // cannot remove from history
    return false;
  }
});

Hands.allow({
  insert: function (userId, hand) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, hand) {
    return true;
    // cannot update history
    if (userId !== hand.user)
      return false; // not the owner
  },
  remove: function (userId, hand) {
    // cannot remove from history
    return false;
  }
});

NumCards.allow({
  insert: function (userId, numCards) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, numCards) {
    if (userId !== numCards.user)
      return false; // not the owner
  },
  remove: function (userId, numCards) {
    return false;
  }
});

GameScores.allow({
  insert: function () {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function () {
    return false;
  },
  remove: function () {
    return false;
  }
});

Meteor.methods({
  // options should include: title, description, public
  createRoom: function (options) {
    options = options || {};
    if (! (typeof options.title === "string" && options.title.length && typeof options.description === "string" && options.description.length) )
      throw new Meteor.Error(400, "Required parameter missing");
    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (options.description.length > 1000)
      throw new Meteor.Error(413, "Description too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Rooms.insert({
      owner: this.userId,
      title: options.title,
      description: options.description,
      public: true,
      allUsers: [],
      ready: false,
      readyPlayers: []
    });
  },

  createMessage: function(options) {
    options = options || {};
    if (!options.room)
      throw new Meteor.Error(400, "Required parameter room missing");
    if (!options.message)
      throw new Meteor.Error(400, "Required parameter message missing");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Messages.insert({
      user: this.userId,
      room: options.room,
      message: options.message,
      createdAt: (new Date()).getTime()
    });
  },


  removeUserFromGame: function(userId, gameId) {
    var game = Games.findOne({'_id': gameId});
    Games.update(
      {'_id': gameId},
      {$pull: { players: userId, places: userId } }
    );
  },

  setGameState: function(gameId, state) {
    var game = Games.findOne({'_id': gameId});
    return Games.update(
      {'_id': gameId},
      {$set: { state: state } }
    );
  },

  setGamePlace: function(gameId, userId) {
    var game = Games.findOne({'_id': gameId});
    return Games.update(
      {'_id': gameId},
      {$push: { place: userId } }
    );
  },

  createGameHistory: function(options) {
    // hand should be an array of strings
    options = options || {};
    if (!options.game)
      throw new Meteor.Error(400, "Required parameter game missing");
    if (!options.hand && options.hand !== '')
      throw new Meteor.Error(400, "Required parameter hand missing");
    if (! this.roomId)
      throw new Meteor.Error(403, "You must be logged in");

    return GameHistory.insert({
      game: options.game,
      user: this.userId,
      hand: hand
    });
  },

  /* Room methods */
  addUserToRoom: function(userId, roomId) {
    var room = Rooms.findOne({'_id': roomId});
    return Rooms.update({'_id': roomId}, {$addToSet: { allUsers: userId } });
  },

  setRoomPlayerReady: function(userId, roomId) {
    var room = Rooms.findOne({'_id': roomId});
    return Rooms.update({'_id': roomId}, {$push: { readyPlayers: userId } });
  },

  clearReadyPlayers: function(roomId) {
    var room = Rooms.findOne({'_id': roomId});
    return Rooms.update({'_id': roomId}, {$set: {'readyPlayers': []}});
  },

  removeUserFromRoom: function(userId, roomId) {
    var room = Rooms.findOne({'_id': roomId});
    return Rooms.update(
      { '_id': roomId },
      { $pull: {
        allUsers: userId,
        readyPlayers: userId
      } }
    );
  },

  createNumCards: function(userId, gameId, numCards) {
    var game = Games.findOne({'_id': gameId}),
        existingNumCards;
    if (game) {
      existingNumCards = NumCards.findOne({'user': userId, 'game': gameId});
      if (!existingNumCards) {
        return NumCards.insert({
          'user': userId,
          'game': gameId,
          'cards': numCards
        });
      }
    }
  },

  waitForServer: function(wait) {
    $('.spinner-container .spinner').toggleClass('inactive', !wait);
    $('.game-controls .actions').toggleClass('inactive', wait);
  },

  resetReadyBtn: function() {
    var $readyBtn = $('.btn.ready');
    $readyBtn.removeClass('disabled').text('Ready Up!');
  }

});

///////////////////////////////////////////////////////////////////////////////
// Users

displayName = function (user) {
  var email,
      shortEmail;
  if (user.profile && user.profile.name)
    return user.profile.name;

  email = user.emails[0].address;
  shortEmail = email.substring(0, email.indexOf('@'));
  return shortEmail;
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};

