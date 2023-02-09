import { Router } from "restify-router"
import { bot } from "../../internal/initialize";
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
  const row = await UspGetStore(req.query["search"], req.query["category"]);
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
  const groupChat = <TeamsBotInstallation>groupChatMap[req.body.id];
  if(!groupChat) {
    res.json("Invalid chat Id");
    return "Invalid chat Id";
  }

  const row = await SendMentionMessage(groupChat, req.body.user, req.body.message);
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

routerInstance.post("/grafana/webhook/:groupid", 
async (req, res) => {
  const row = await GrafanaWebhook(req.body, req.params.groupid);
  res.json(row);
});

routerInstance.post("/sendTeamMessage", 
async (req, res) => {  
  const installations = await bot.notification.installations();

  let ret = null;
  for (const target of installations) {    
    if (target.type === 'Channel' && target.conversationReference.conversation.id === req.body.id) {
      ret = await target.sendMessage(req.body.message);
    }
  }
  return res.json(ret);
});

routerInstance.post("/sendTeamMentionMessage", 
async (req, res) => {  
  const installations = await bot.notification.installations();

  let ret = null;
  for (const target of installations) {    
    if (target.type === 'Channel' && target.conversationReference.conversation.id === req.body.id) {
      ret = await SendMentionMessage(target, req.body.user, req.body.message);
    }
  }
  return res.json(ret);
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

export const GrafanaWebhook = async (body, groupid: string) => {
  if(!groupid) {
    return "Invalid request";
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[groupid];
  console.log(JSON.stringify(groupChatMap));
  if(!groupChat) {
    return "Invalid chat Id";
  }

  let message = "";
  if(body.alerts[0].status === "resolved") {
    message = "**알림 발생 상태가 해제되었습니다.**" + 
    "\n\nalertname : " + body.alerts[0].labels.alertname + 
    "\n\nsummary : " + body.alerts[0].annotations.summary + 
    "\n\ndescription : " + body.alerts[0].annotations.description + 
    "\n\nstatus : " + body.alerts[0].status;
  } else {
    message = "**그라파나 알림 발생!!**" + 
    "\n\nalertname : " + body.alerts[0].labels.alertname + 
    "\n\nsummary : " + body.alerts[0].annotations.summary + 
    "\n\ndescription : " + body.alerts[0].annotations.description + 
    "\n\nstatus : " + body.alerts[0].status + 
    "\n\nvalue : " + body.alerts[0].valueString + 
    "\n\ngeneratorURL : " + body.alerts[0].generatorURL + 
    "\n\nsilenceURL : " + body.alerts[0].silenceURL;
  }

  return JSON.stringify(await groupChat.sendMessage(message));
}

export const SendMentionMessage = async (target: TeamsBotInstallation, username: string, messageText: string) => {
  if(!messageText || !username) {
    return "Invalid request";
  }

  let user = <Member>null;
  for (const u of Object.entries(userMap)) {
    if(u[1].FullNameKR === username) {
      user = <Member>u[1];
      break;
    }
  }
  
  if(!user) {
    return JSON.stringify("Id not found change sendMessage => " + await target.sendMessage(<string>messageText));
  }

  const mention: Mention = {
      mentioned: user.account,
      text: `<at> </at>`,
      type: 'mention'
  };

  const message: Partial<Activity> = {
      entities: [mention],
      text: messageText.replace(username, mention.text),
      type: ActivityTypes.Message
  };

  return JSON.stringify(await target.sendMessage(<string>message));
}