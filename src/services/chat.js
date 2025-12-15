// frontend/src/services/chat.js
import API from "./api";

export const getOrCreateConversation = (data) => API.post("/chat/conversations", data);
export const getConversations = () => API.get("/chat/conversations");
export const getMessages = (convId) => API.get(`/chat/conversations/${convId}/messages`);
export const postMessage = (data) => API.post("/chat/messages", data);

export const createGroup = (data) => API.post("/chat/groups", data);
export const getGroups = () => API.get("/chat/groups");
export const getGroupMessages = (groupId) => API.get(`/chat/groups/${groupId}/messages`);

export const uploadFile = (formData) => API.post("/chat/upload", formData);
