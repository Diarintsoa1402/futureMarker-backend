// backend/src/models/index.js
const User = require("./User");
const Group = require("./chat/Group");
const GroupMember = require("./chat/GroupeMember");
const Conversation = require("./chat/Conversation");
const Message = require("./chat/Message");
// formation 
const Formation = require("./Formation");
const FormationModule = require("./FormationModule");
const FormationEnrollment = require("./FormationEnrollment");
const ModuleProgress = require("./ModuleProgress");

// projets
const Project = require("./Project");
const ProjectUpdate = require("./ProjectUpdate");

// Formation -> Modules
Formation.hasMany(FormationModule, {
  foreignKey: "formationId",
  as: "modules"
});
FormationModule.belongsTo(Formation, {
  foreignKey: "formationId"
});

// Formation -> Inscriptions
Formation.hasMany(FormationEnrollment, {
  foreignKey: "formationId",
  as: "enrollments"
});
FormationEnrollment.belongsTo(Formation, {
  foreignKey: "formationId"
});

// User (Woman) -> Inscriptions
User.hasMany(FormationEnrollment, {
  foreignKey: "womanId",
  as: "formationEnrollments"
});
FormationEnrollment.belongsTo(User, {
  foreignKey: "womanId",
  as: "woman"
});

// Enrollment -> Progress
FormationEnrollment.hasMany(ModuleProgress, {
  foreignKey: "enrollmentId",
  as: "moduleProgress"
});
ModuleProgress.belongsTo(FormationEnrollment, {
  foreignKey: "enrollmentId"
});

// Module -> Progress
FormationModule.hasMany(ModuleProgress, {
  foreignKey: "moduleId",
  as: "progress"
});
ModuleProgress.belongsTo(FormationModule, {
  foreignKey: "moduleId",
  as: "module"
});
// ✅ Définir toutes les associations ici
// User <-> GroupMember <-> Group
User.hasMany(GroupMember, { foreignKey: "userId", as: "groupMemberships" });
GroupMember.belongsTo(User, { foreignKey: "userId", as: "user" });

Group.hasMany(GroupMember, { foreignKey: "groupId", as: "members" });
GroupMember.belongsTo(Group, { foreignKey: "groupId", as: "group" });

// Association many-to-many via belongsToMany
User.belongsToMany(Group, { 
  through: GroupMember, 
  foreignKey: "userId", 
  otherKey: "groupId",
  as: "groups" 
});

Group.belongsToMany(User, { 
  through: GroupMember, 
  foreignKey: "groupId", 
  otherKey: "userId",
  as: "users" 
});

// Conversations
User.hasMany(Conversation, { foreignKey: "user1Id", as: "conversationsAsUser1" });
User.hasMany(Conversation, { foreignKey: "user2Id", as: "conversationsAsUser2" });
Conversation.belongsTo(User, { foreignKey: "user1Id", as: "user1" });
Conversation.belongsTo(User, { foreignKey: "user2Id", as: "user2" });

// Messages
User.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });

Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages" });
Message.belongsTo(Conversation, { foreignKey: "conversationId", as: "conversation" });

Group.hasMany(Message, { foreignKey: "groupId", as: "messages" });
Message.belongsTo(Group, { foreignKey: "groupId", as: "group" });


module.exports = {
  User,
  Group,
  GroupMember,
  Conversation,
  Message,
  Formation,
  FormationModule,
  FormationEnrollment,
  ModuleProgress,
  Project,
  ProjectUpdate
};