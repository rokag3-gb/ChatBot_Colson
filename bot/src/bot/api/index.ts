import { Router } from "restify-router"
import {
  UspGetWorkplaceTeam,
  UspGetTeam,
  UspGetStore,
  UspGetTag,
  UspSetTag,
  UspDeleteTag,
  UspSetWorkplace,
} from "./query"

import { ActivityTypes, Mention, Activity } from "botbuilder";

import {
  UspGetWorkCode,
} from "../setWorkplace/query"

import { TeamsBotInstallation, Member } from "@microsoft/teamsfx"

import { groupChatMap, userMap } from "../common"

export const routerInstance = new Router();

routerInstance.get('/getWorkplace', async (req, res) => {
  const row = await UspGetWorkplaceTeam(req.query["startDate"], req.query["endDate"], req.query["team"]);
  res.json(row);
});

routerInstance.get('/getTeam', async (req, res) => {
  const row = await UspGetTeam(req.query["UPN"]);
  res.json(row);
});

routerInstance.get('/getStore', async (req, res) => {
  const row = await UspGetStore(req.query["search"]);
  res.json(row);
});

routerInstance.get('/tag', async (req, res) => {
  const row = await UspGetTag(Number(req.query["storeId"]));
  res.json(row);
});

routerInstance.post('/tag', async (req, res) => {
  const row = await UspSetTag(Number(req.body["storeId"]), req.body["tag"], req.body["UPN"]);
  res.json(row);
});

routerInstance.del('/tag', async (req, res) => {
  const row = await UspDeleteTag(Number(req.query["storeId"]), req.query["tag"], req.query["UPN"]);
  res.json(row);
});

routerInstance.post("/sendGroupMessage", 
async (req, res) => {  
  const row = await SendGroupMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/sendGroupMentionMessage", 
async (req, res) => {  
  const row = await SendGroupMentionMessage(req.body.id, req.body.user, req.body.message);
  res.json(row);
});

routerInstance.post("/sendUserMessage", 
async (req, res) => {  
  const row = await SendUserMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/setWorkplace", 
async (req, res) => {  
  if(!req.body.workDate || !req.body.upn) {
    return;
  }
  const row = await UspSetWorkplace(req.body.workDate, req.body.upn, req.body.workCodeAM===''?null:req.body.workCodeAM, req.body.workCodePM===''?null:req.body.workCodePM);
  res.json(row);
});

routerInstance.get('/getWorkCode', async (req, res) => {
  const row = await UspGetWorkCode();
  res.json(row);
});

export const SendGroupMessage = async (id: string, message: string) => {
  if(!id || !message) {
    return "Invalid request";
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[id];
  console.log(JSON.stringify(groupChatMap));
  if(!groupChat) {
    return "Invalid chat Id";
  }

  return JSON.stringify(await groupChat.sendMessage(message));
}

export const SendGroupMentionMessage = async (id: string, username: string, messageText: string) => {
  if(!id || !messageText || !username) {
    return "Invalid request";
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[id];
  console.log(JSON.stringify(groupChatMap));
  if(!groupChat) {
    return "Invalid chat Id";
  }

  let user = <Member>null;
  for (const u of Object.entries(userMap)) {
    if(u[1].FullNameKR === username) {
      user = <Member>u[1];
      break;
    }
  }
  
  if(!user) {
    return SendGroupMessage(id, messageText);
  }

  const mention: Mention = {
      mentioned: user.account,
      text: `<at>${user.account.name}</at>`,
      type: 'mention'
  };

  const message: Partial<Activity> = {
      entities: [mention],
      text: messageText.replace(username, mention.text),
      type: ActivityTypes.Message
  };

  return JSON.stringify(await groupChat.sendMessage(<string>message));
}

export const SendUserMessage = async (id: string, message: string) => {
  if(!id || !message) {
    return "Invalid request";
  }

  const user = <Member>userMap[id];
  console.log(JSON.stringify(groupChatMap));
  if(!user) {
    return "Invalid chat Id";
  }

  return JSON.stringify(await user.sendMessage(message));
}