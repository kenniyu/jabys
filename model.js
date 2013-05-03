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
      allUsers: []
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
      message: options.message
    });
  },

  addUserToRoom: function(userId, roomId) {
    var room = Rooms.findOne({'_id': roomId});
    Rooms.update({'_id': roomId}, {$addToSet: { allUsers: userId } });
  }

});

///////////////////////////////////////////////////////////////////////////////
// Users

displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  return user.emails[0].address;
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};
