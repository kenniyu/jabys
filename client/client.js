// All Tomorrow's Parties -- client

Meteor.subscribe("directory");
Meteor.subscribe("rooms");
Meteor.subscribe("messages");
Meteor.subscribe("games");
Meteor.subscribe("gameHistory");

// If no room selected, select one.
Meteor.startup(function () {
  Deps.autorun(function () {
    if (! Session.get("selected")) {
      var room = Rooms.findOne();
      if (room)
        Session.set("selected", room._id);
    }
  });
});

///////////////////////////////////////////////////////////////////////////////
// Room details sidebar

Template.roomTemplate.messages = function () {
  var messages = Messages.find({
    room: Session.get('currentRoom')
  });
  return messages;
};

Template.roomTemplate.playerReadyState = function () {
  var userId = this._id,
      roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId});
  if (_.contains(room.readyPlayers, userId)) {
    return 'ready';
  } else {
    return 'waiting';
  }
};

Template.roomTemplate.readyBtn = function() {
  var roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId}),
      readyState = room.ready,
      existingGame = Games.findOne({'room': roomId, 'state': 'playing'});

  return room.allUsers.length > 1 && !existingGame;
};

Template.roomTemplate.readied = function() {
  var roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId}),
      userId = Meteor.userId();
  return _.contains(room.readyPlayers, userId);
};

Template.roomTemplate.myCards = function() {
  var roomId = Session.get('currentRoom'),
      userId = Meteor.userId(),
      game = Games.findOne({'room': roomId, 'state': 'playing'}),
      gameId,
      hand;

  if (game) {
    gameId = game._id;
    hand = Meteor.call('getHand', userId, gameId);
    console.log(gameId);
    console.log(hand);
    return hand;
  } else {
    console.log('no game yet');
    return [];
  }
};

Template.roomTemplate.events({
  'keyup .chat-input': function (event) {
    var keyCode = event.keyCode,
        message;
    if (keyCode === 13) {
      message = $(event.target).val();
      submitChat(message);
      $(event.target).val('');
    }
    event.preventDefault();
  },

  'click .card': function(event) {
    var $card = $(event.target).closest('.card');
    $card.toggleClass('selected');
    event.preventDefault();
  },

  'click .ready': function(event) {
    var $readyBtn = $(event.target).closest('.ready');
    if (!$readyBtn.hasClass('disabled')) {
      setPlayerReady();
    }
    event.preventDefault();
  }

});

Template.roomTemplate.room = function () {
  return Rooms.findOne(Session.get("selected"));
};

Template.roomTemplate.allUsers = function() {
  var roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId}),
      allUsers;

  allUsers = Meteor.users.find(
    {_id: {$in: room.allUsers}}
  );
  return allUsers;
};

Template.roomTemplate.displayName = function () {
  var userId = this.user || this._id,
      user = Meteor.users.findOne(userId);

  if (user) {
    if (user._id === Meteor.userId()) {
      return 'me';
    }
    return displayName(user);
  } else {
    return 'none';
  }
};

Template.allRoomsTemplate.rooms = function () {
  var rooms = Rooms.find(
    {},
    {sort: {title: 1} }
  );
  return rooms;
};

Template.allRoomsTemplate.anyRooms = function () {
  return Rooms.find().count() > 0;
};

Template.allRoomsTemplate.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if (owner._id === Meteor.userId())
    return "me";
  return displayName(owner);
};

Template.allRoomsTemplate.canRemove = function () {
  return this.owner === Meteor.userId();
};

Template.allRoomsTemplate.inRoom = function () {
  return _.contains(this.allUsers, Meteor.userId());
};

Template.allRoomsTemplate.numUsers = function () {
  if (this && this.allUsers) {
    return this.allUsers.length || 0;
  }
  return '0';
};

Template.allRoomsTemplate.events({
  'click .remove': function () {
    Rooms.remove(this._id);
    return false;
  },
  'click .create': function (event) {
    openCreateDialog();
    event.preventDefault();
  },
  'click .join': function (event) {
    var roomId = $(event.target).closest('li').attr('data-room-id');
    joinRoom(roomId);
    event.preventDefault();
  }
});

///////////////////////////////////////////////////////////////////////////////
// Party attendance widget

/*
Template.attendance.rsvpName = function () {
  var user = Meteor.users.findOne(this.user);
  return displayName(user);
};

Template.attendance.outstandingInvitations = function () {
  var party = Parties.findOne(this._id);
  return Meteor.users.find({$and: [
    {_id: {$in: party.invited}}, // they're invited
    {_id: {$nin: _.pluck(party.rsvps, 'user')}} // but haven't RSVP'd
  ]});
};

Template.attendance.invitationName = function () {
  return displayName(this);
};

Template.attendance.rsvpIs = function (what) {
  return this.rsvp === what;
};

Template.attendance.nobody = function () {
  return ! this.public && (this.rsvps.length + this.invited.length === 0);
};

Template.attendance.canInvite = function () {
  return ! this.public && this.owner === Meteor.userId();
};
*/

///////////////////////////////////////////////////////////////////////////////
// Map display

// Use jquery to get the position clicked relative to the map element.

/*
Template.map.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };

      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};

Template.map.destroyed = function () {
  this.handle && this.handle.stop();
};
*/

///////////////////////////////////////////////////////////////////////////////
// Create Room dialog


/* Templates */

/* Page */
Template.page.showCreateDialog = function () {
  return Session.get('showCreateDialog');
};

Template.page.getCurrentChats = function () {
  return Session.get('showCreateDialog');
};

Template.page.currentRoom = function() {
  return Session.get('currentRoom');
};

/* Header */
Template.header.currentRoom = function() {
  return Session.get('currentRoom');
};

Template.header.gameState = function() {
  var roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId}),
      game = Games.findOne({'room': roomId, 'state': 'playing'});

  if (game) {
    return game.state;
  } else {
    return 'waiting';
  }
};

Template.header.roomTitle = function() {
  var roomId = Session.get('currentRoom'),
      room = Rooms.findOne({'_id': roomId});
  return room.title;
};

Template.header.events({
  'click .leave': function(event) {
    leaveRoom();
    event.preventDefault();
  }
});

Template.createDialog.events({
  'click .save': function (event, template) {
    var title = template.find('.title').value;
    var description = template.find('.description').value;
    /*
    var public = ! template.find(".private").checked;
   */
    var public = true;

    if (title.length && description.length) {
      Meteor.call('createRoom', {
        title: title,
        description: description,
        public: public
      }, function (error, room) {
        if (! error) {
          Session.set("selected", room);
          joinRoom(room);
          //Session.set("currentRoom", room);
        }
      });
      Session.set("showCreateDialog", false);
    } else {
      Session.set("createError",
                  "It needs a title and a description, or why bother?");
    }
  },

  'click .cancel': function (event) {
    Session.set("showCreateDialog", false);
    event.preventDefault();
  }
});

Template.createDialog.error = function () {
  return Session.get("createError");
};

///////////////////////////////////////////////////////////////////////////////
// Invite dialog

/*
var openInviteDialog = function () {
  Session.set("showInviteDialog", true);
};

Template.page.showInviteDialog = function () {
  return Session.get("showInviteDialog");
};

Template.inviteDialog.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("selected"), this._id);
  },
  'click .done': function (event, template) {
    Session.set("showInviteDialog", false);
    return false;
  }
});

Template.inviteDialog.uninvited = function () {
  var party = Parties.findOne(Session.get("selected"));
  if (! party)
    return []; // party hasn't loaded yet
  return Meteor.users.find({$nor: [{_id: {$in: party.invited}},
                                   {_id: party.owner}]});
};

Template.inviteDialog.displayName = function () {
  return displayName(this);
};
*/

/* Sidebar actions */
var submitChat = function(message) {
  var room = Session.get("currentRoom"),
      userId = Meteor.userId(),
      user = getUser(userId);

  Meteor.call('createMessage', {
    user: user,
    room: room,
    message: message
  }, function (error, room) {
    if (! error) {
      console.log('message sent!');
    }
  });
};

/* Helper methods */
var openCreateDialog = function () {
  Session.set("createError", null);
  Session.set("currentRoom", null);
  Session.set("showCreateDialog", true);
};

var joinRoom = function(roomId) {
  var room,
      userId = Meteor.userId(),
      prevRoom = Rooms.findOne({ allUsers: {$regex : userId}});

  if (prevRoom) {
    Meteor.call('removeUserFromRoom', userId, prevRoom._id);
    leaveRoomCb(prevRoom._id);
  }

  room = Rooms.findOne({'_id': roomId});
  Meteor.call('addUserToRoom', Meteor.userId(), roomId);
  Session.set('currentRoom', room._id);
  joinRoomCb(roomId);
};

var leaveRoom = function(urlNavigate) {
  if (Session.get('currentRoom')) {
    var roomId = Session.get('currentRoom'),
        room = Rooms.findOne({'_id': roomId}),
        userId = Meteor.userId(),
        doLeave;

    doLeave = confirm("You are about to leave this room. If you are in the middle of a game, you will lose.\n\nAre you sure you want to leave this room?");

    if (doLeave) {
      Meteor.call('removeUserFromRoom', Meteor.userId(), roomId);
      Session.set('currentRoom', null);
      leaveRoomCb(roomId);
    }
  }
};

var getUser = function(userId) {
  var user = Meteor.users.findOne({'_id': userId});
  return user;
};

var leaveRoomCb = function(roomId) {
  var room = Rooms.findOne({'_id': roomId}),
      game,
      userId = Meteor.userId();
  if (!room)
    return

  game = Games.findOne({'room': roomId, 'state': 'playing'});
  if (game) {
    // was there an ongoing game this player was a part of?
    if (_.contains(game.players, userId)) {
      // remove leaver from players list
      Meteor.call('removeUserFromGame', userId, game._id);
    }
  }

  // refresh room
  room = Rooms.findOne({'_id': roomId});
  if (room.allUsers.length <= 1) {
    // there's only 1 person left. if theres a game, end it
    if (game) {
      Meteor.call('setGameState', game._id, 'finished');
      Meteor.call('setGamePlace', room.allUsers[0]);
      Meteor.call('clearReadyPlayers', roomId);
      Session.set('currentGame', null);
    }
    Meteor.call('setRoomReady', roomId, false);
  } else {
    Meteor.call('setRoomReady', roomId, true);
  }
}

var joinRoomCb = function(roomId) {
  var room = Rooms.findOne({'_id': roomId}),
      game;
  if (room) {
    existingGame = Games.findOne({'room': roomId, 'state': 'playing'});
    if (existingGame) {
      // game exists, check game state
      // room not ready for a game, b/c one currently exists
      Meteor.call('setRoomReady', roomId, false);
    } else {
      // no existing game, simple check of # people in room
      if (room.allUsers.length >= 2) {
        Meteor.call('setRoomReady', roomId, true);
      } else {
        Meteor.call('setRoomReady', roomId, false);
      }
    }
  }
};


var setPlayerReady = function() {
  var roomId  = Session.get('currentRoom'),
      room    = Rooms.findOne({'_id': roomId}),
      userId  = Meteor.userId();
  if (_.contains(room.readyPlayers, userId)) {
    // this player already readied up
    console.log('Refusing to ready again. Already ready.');
  } else {
    Meteor.call('setRoomPlayerReady', userId, roomId);
    // refetch the room
    room = Rooms.findOne({'_id': roomId});
    if (room.ready && room.readyPlayers.length === room.allUsers.length) {
      Meteor.call('startGame', roomId, function (error, game) {
        if (! error) {
          console.log(game);
          Session.set('currentGame', game);
          // after game succesfully starts, deal everyone their hands
          Meteor.call('dealHands', game);
        }
      });
    }
  }
};
