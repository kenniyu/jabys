// All Tomorrow's Parties -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1}});
});

Meteor.publish("rooms", function () {
  return Rooms.find(
    {
      $or: [  {"public": true},
	      {invited: this.userId}, 
	      {owner: this.userId}     ]
    }
  );
});

Meteor.publish("messages", function () {
  return Messages.find({});
});
