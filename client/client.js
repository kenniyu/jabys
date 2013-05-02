// All Tomorrow's Parties -- client

Meteor.subscribe("directory");
Meteor.subscribe("rooms");

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

Template.chatroom.messages = function () {
  var currentRoom = Rooms.findOne(Session.get('currentChatroom'));
  return currentRoom.messages;
}

Template.chatrooms.room = function () {
  return Rooms.findOne(Session.get("selected"));
};

Template.chatrooms.rooms = function () {
  return Rooms.find();
};

Template.chatrooms.anyRooms = function () {
  return Rooms.find().count() > 0;
};

Template.chatrooms.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if (owner._id === Meteor.userId())
    return "me";
  return displayName(owner);
};

Template.chatrooms.canRemove = function () {
  return this.owner === Meteor.userId();
};

Template.chatrooms.events({
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

var openCreateDialog = function () {
  Session.set("createError", null);
  Session.set("currentChatroom", null);
  Session.set("showCreateDialog", true);
};

var joinRoom = function(roomId) {
  console.log(roomId);
  var room = Rooms.findOne({'_id': roomId});
  console.log(room);
  Session.set("currentChatroom", room);
  console.log(room);
}

Template.page.showCreateDialog = function () {
  return Session.get("showCreateDialog");
};

Template.page.getCurrentChats = function () {
  return Session.get("showCreateDialog");
};

Template.page.currentChatroom = function() {
  return Session.get("currentChatroom");
}

Template.createDialog.events({
  'click .save': function (event, template) {
    var title = template.find(".title").value;
    var description = template.find(".description").value;
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
          Session.set("currentChatroom", room);
        }
      });
      Session.set("showCreateDialog", false);
    } else {
      Session.set("createError",
                  "It needs a title and a description, or why bother?");
    }
  },

  'click .cancel': function () {
    Session.set("showCreateDialog", false);
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
