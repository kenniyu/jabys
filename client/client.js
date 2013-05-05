// All Tomorrow's Parties -- client

Meteor.subscribe("directory");
Meteor.subscribe("rooms");
Meteor.subscribe("messages");
Meteor.subscribe("games");
Meteor.subscribe("gameHistory");
Meteor.subscribe("hands");

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

Template.roomTemplate.myHand = function() {
};

Template.roomTemplate.myCards = function() {
  var roomId = Session.get('currentRoom'),
      userId = Meteor.userId(),
      game = Games.findOne({'room': roomId, 'state': 'playing'}),
      gameId,
      hand,
      cards = [],
      card,
      numCards;

  if (game) {
    gameId = game._id;
    hand = Hands.findOne({'game': gameId, 'user': userId});
    if (hand) {
      cards = _.map(hand.cards, toCardObj);
    }
    /*
    Meteor.call('getHand', userId, gameId, function(error, hand) {
      Session.set("currentHand", hand);
      return hand;
    });
    */
  }
  console.log(cards);
  return cards;
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

Template.roomTemplate.displayCard = function(cardLabel) {
  var val, suit, htmlString;
  if (cardLabel) {
    if (cardLabel.length == 3) {
      val = '10';
      suit = cardLabel[2];
    }
    else {
      val = cardLabel[0];
      suit = cardLabel[1];
    }

    switch (suit) {
      case "C":
        switch (val) {
          case 'A':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>A<br />&clubs;</div><div class='ace'>&clubs;</div></div></div>";
            break;
          case '2':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>2<br />&clubs;</div><div class='spotB1'>&clubs;</div><div class='spotB5'>&clubs;</div></div></div>";
            break;
          case '3':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>3<br />&clubs;</div><div class='spotB1'>&clubs;</div><div class='spotB3'>&clubs;</div><div class='spotB5'>&clubs;</div></div></div>";
            break;
          case '4':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>4<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case '5':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>5<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotB3'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case '6':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>6<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA3'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC3'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case '7':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>7<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA3'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotB2'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC3'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case '8':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>8<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA3'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotB2'>&clubs;</div><div class='spotB4'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC3'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;          
          case '9':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>9<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA2'>&clubs;</div><div class='spotA4'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotB3'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC2'>&clubs;</div><div class='spotC4'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case '10':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>10<br />&clubs;</div><div class='spotA1'>&clubs;</div><div class='spotA2'>&clubs;</div><div class='spotA4'>&clubs;</div><div class='spotA5'>&clubs;</div><div class='spotB2'>&clubs;</div><div class='spotB4'>&clubs;</div><div class='spotC1'>&clubs;</div><div class='spotC2'>&clubs;</div><div class='spotC4'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case 'J':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>J<br />&clubs;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/jack.gif' alt='' /><div class='spotA1'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case 'Q':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>Q<br />&clubs;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/queen.gif' alt='' /><div class='spotA1'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
          case 'K':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='c'>K<br />&clubs;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/king.gif' alt='' /><div class='spotA1'>&clubs;</div><div class='spotC5'>&clubs;</div></div></div>";
            break;
        }
        break;

      case "D":
        switch (val) {
          case 'A':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>A<br />&diams;</div><div class='ace'>&diams;</div></div></div>";
            break;
          case '2':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>2<br />&diams;</div><div class='spotB1'>&diams;</div><div class='spotB5'>&diams;</div></div></div>";
            break;
          case '3':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>3<br />&diams;</div><div class='spotB1'>&diams;</div><div class='spotB3'>&diams;</div><div class='spotB5'>&diams;</div></div></div>";
            break;
          case '4':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>4<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case '5':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>5<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotB3'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case '6':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>6<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA3'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC3'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case '7':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>7<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA3'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotB2'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC3'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case '8':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>8<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA3'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotB2'>&diams;</div><div class='spotB4'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC3'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;          
          case '9':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>9<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA2'>&diams;</div><div class='spotA4'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotB3'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC2'>&diams;</div><div class='spotC4'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case '10':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>10<br />&diams;</div><div class='spotA1'>&diams;</div><div class='spotA2'>&diams;</div><div class='spotA4'>&diams;</div><div class='spotA5'>&diams;</div><div class='spotB2'>&diams;</div><div class='spotB4'>&diams;</div><div class='spotC1'>&diams;</div><div class='spotC2'>&diams;</div><div class='spotC4'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case 'J':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>J<br />&diams;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/jack.gif' alt='' /><div class='spotA1'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case 'Q':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>Q<br />&diams;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/queen.gif' alt='' /><div class='spotA1'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
          case 'K':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='d'>K<br />&diams;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/king.gif' alt='' /><div class='spotA1'>&diams;</div><div class='spotC5'>&diams;</div></div></div>";
            break;
        }
        break;

      case "H":
        switch (val){
          case 'A':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>A<br />&hearts;</div><div class='ace'>&hearts;</div></div></div>";
            break;
          case '2':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>2<br />&hearts;</div><div class='spotB1'>&hearts;</div><div class='spotB5'>&hearts;</div></div></div>";
            break;
          case '3':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>3<br />&hearts;</div><div class='spotB1'>&hearts;</div><div class='spotB3'>&hearts;</div><div class='spotB5'>&hearts;</div></div></div>";
            break;
          case '4':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>4<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case '5':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>5<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotB3'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case '6':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>6<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA3'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC3'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case '7':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>7<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA3'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotB2'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC3'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case '8':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>8<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA3'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotB2'>&hearts;</div><div class='spotB4'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC3'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;          
          case '9':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>9<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA2'>&hearts;</div><div class='spotA4'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotB3'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC2'>&hearts;</div><div class='spotC4'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case '10':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>10<br />&hearts;</div><div class='spotA1'>&hearts;</div><div class='spotA2'>&hearts;</div><div class='spotA4'>&hearts;</div><div class='spotA5'>&hearts;</div><div class='spotB2'>&hearts;</div><div class='spotB4'>&hearts;</div><div class='spotC1'>&hearts;</div><div class='spotC2'>&hearts;</div><div class='spotC4'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case 'J':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>J<br />&hearts;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/jack.gif' alt='' /><div class='spotA1'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case 'Q':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>Q<br />&hearts;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/queen.gif' alt='' /><div class='spotA1'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          case 'K':
            htmlString = "<div class='card'><div class='front red'><div class='index' data-suit='h'>K<br />&hearts;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/king.gif' alt='' /><div class='spotA1'>&hearts;</div><div class='spotC5'>&hearts;</div></div></div>";
            break;
          }
          break;

      case "S":
        switch (val) {
          case 'A':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>A<br />&spades;</div><div class='ace'>&spades;</div></div></div>";
            break;
          case '2':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>2<br />&spades;</div><div class='spotB1'>&spades;</div><div class='spotB5'>&spades;</div></div></div>";
            break;
          case '3':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>3<br />&spades;</div><div class='spotB1'>&spades;</div><div class='spotB3'>&spades;</div><div class='spotB5'>&spades;</div></div></div>";
            break;
          case '4':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>4<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case '5':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>5<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotB3'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case '6':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>6<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA3'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC3'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case '7':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>7<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA3'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotB2'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC3'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case '8':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>8<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA3'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotB2'>&spades;</div><div class='spotB4'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC3'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;          
          case '9':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>9<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA2'>&spades;</div><div class='spotA4'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotB3'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC2'>&spades;</div><div class='spotC4'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case '10':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>10<br />&spades;</div><div class='spotA1'>&spades;</div><div class='spotA2'>&spades;</div><div class='spotA4'>&spades;</div><div class='spotA5'>&spades;</div><div class='spotB2'>&spades;</div><div class='spotB4'>&spades;</div><div class='spotC1'>&spades;</div><div class='spotC2'>&spades;</div><div class='spotC4'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case 'J':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>J<br />&spades;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/jack.gif' alt='' /><div class='spotA1'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case 'Q':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>Q<br />&spades;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/queen.gif' alt='' /><div class='spotA1'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          case 'K':
            htmlString = "<div class='card'><div class='front black'><div class='index' data-suit='s'>K<br />&spades;</div><img class='face' src='http://www.brainjar.com/css/cards/graphics/king.gif' alt='' /><div class='spotA1'>&spades;</div><div class='spotC5'>&spades;</div></div></div>";
            break;
          }
        break;
    }
  }
  else {
    htmlString = "<div class='card'></div>"; 
  }
  return htmlString;
}

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
      Meteor.call('startGame', roomId);
    }
  }
};

var toCardObj = function(cardStr) {
  var cardObj,
      index,
      value,
      suit,
      label,
      suitColor;

  if (cardStr.length === 3) {
    index = 10;
    value = 10;
    suit = cardStr.substring(2);
    label = cardStr;
  } else {
    index = cardStr.substring(0, 1);
    value = cardStr.substring(0, 1);
    suit = cardStr.substring(1);
    label = cardStr;
  }

  if (suit === 'C' || suit === 'S') {
    suitColor = 'black';
  } else {
    suitColor = 'red';
  }

  cardObj = {
    'label': label,
    'index': cardStr.substring(0, 1),
    'value': cardStr.substring(0, 1),
    'suit': cardStr.substring(1),
    'color': suitColor
  }
  return cardObj;
};
