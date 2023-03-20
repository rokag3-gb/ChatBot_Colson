import { bot } from "../../internal/initialize";
import {  UspGetWorkCode,} from "../setWorkplace/query"
import { groupChatMap, userMap, insertLog, } from "../common"

import { Router } from "restify-router"
import { ActivityTypes, Mention, Activity } from "botbuilder";
import { TeamsBotInstallation, Member } from "@microsoft/teamsfx"
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import {
  UspGetWorkplaceTeam,
  UspGetTeam,
  UspGetStore,
  UspGetTag,
  UspSetTag,
  UspDeleteTag,
  UspSetWorkplace,
} from "./query"

export const routerInstance = new Router();

async function verifyToken(token: string, publicKey: string, audience: string, path: string): Promise<boolean> {
  let ret = false;
  try {
    const decoded = jwt.decode(token, {complete: true});
    const payload = (<any>decoded).payload;
    const preferred_username = payload.preferred_username;
  
    await jwt.verify(token, publicKey, { audience }, async (err) => {
      if (err) {
        console.log(preferred_username, 'Invalid token '+ path + ' token : ' + JSON.stringify(payload));
        await insertLog(preferred_username, 'Invalid token '+ path + ' token : ' + JSON.stringify(payload));
        ret = false;
      } else {
        console.log(preferred_username, 'Valid token '+ path + ' token : ' + JSON.stringify(payload));
        await insertLog(preferred_username, 'Valid token '+ path + ' token : ' + JSON.stringify(payload));
        ret = true
      }
    });
  } catch(e) {
    await insertLog('verifyToken', "Error : " + JSON.stringify(e) + ", " + e.message);
  }

  return ret;
}

const validationToken = async (token: string, path: string): Promise<boolean> => {
  if(!token) {
    await insertLog('', 'token is null '+ path)
    return false;
  }
  const [header, payload] = token.split('.');

  const headerObj = JSON.parse(Buffer.from(header, 'base64').toString());
  const payloadObj = JSON.parse(Buffer.from(payload, 'base64').toString());

  const jwksUri = 'https://login.microsoftonline.com/6d5ac8ee-3862-4452-93e7-a836c2d9742b/discovery/v2.0/keys';
  const kid = headerObj.kid;
  const audience = payloadObj.aud;

  const client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 60 * 60,
  });

  const getSigningKey = promisify(client.getSigningKey);
  const  publicKey  = await getSigningKey(kid);
  return await verifyToken(token, publicKey.getPublicKey(), audience, path);
}

routerInstance.get('/getWorkplace', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const row = await UspGetWorkplaceTeam(req.query["startDate"], req.query["endDate"], req.query["team"]);
  res.json(row);
});

routerInstance.get('/getTeam', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const row = await UspGetTeam(req.query["UPN"]);
  res.json(row);
});

routerInstance.get('/getStore', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const row = await UspGetStore(req.query["search"], req.query["category"]);
  res.json(row);
});

routerInstance.get('/tag', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const row = await UspGetTag(Number(req.query["storeId"]));
  res.json(row);
});

routerInstance.post('/tag', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }
  
  const row = await UspSetTag(Number(req.body["storeId"]), req.body["tag"], req.body["UPN"]);
  res.json(row);
});

routerInstance.del('/tag', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }
  
  const row = await UspDeleteTag(Number(req.query["storeId"]), req.query["tag"], req.query["UPN"]);
  res.json(row);
});

routerInstance.post("/sendUserMessage", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }
  
  const row = await SendUserMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/setWorkplace", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }
  
  if(!req.body.workDate || !req.body.upn) {
    return;
  }
  const row = await UspSetWorkplace(req.body.workDate, req.body.upn, req.body.workCodeAM===''?null:req.body.workCodeAM, req.body.workCodePM===''?null:req.body.workCodePM);
  res.json(row);
});

routerInstance.get('/getWorkCode', async (req, res) => {
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }
  
  const row = await UspGetWorkCode();
  res.json(row);
});

routerInstance.post("/grafana/webhook/:groupid", 
async (req, res) => {
  const row = await GrafanaWebhook(req.body, req.params.groupid);
  res.json(row);
});


// Message

routerInstance.post("/sendGroupMessage", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const row = await SendGroupMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/sendGroupMentionMessage", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[req.body.id];
  if(!groupChat) {
    res.json("Invalid chat Id");
    return "Invalid chat Id";
  }

  const row = await SendMentionMessage(groupChat, req.body.user, req.body.message);
  res.json(row);
});

//이 부분 나중에 삭제하기!!
routerInstance.post("/sendTeamMessage", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const installations = await bot.notification.installations();

  let ret = null;
  for (const target of installations) {    
    if (target.type === 'Channel' && target.conversationReference.conversation.id === req.body.id) {
      ret = await target.sendMessage(req.body.message);
    }
  }
  return res.json(ret);
});

routerInstance.post("/sendTeamMentionMessage", async (req, res) => {  
  if (!await validationToken(req.authorization.credentials, req.getUrl().path)) {
    console.log('인증실패');
  }

  const installations = await bot.notification.installations();

  let ret = null;
  for (const target of installations) {    
    if (target.type === 'Channel' && target.conversationReference.conversation.id === req.body.id) {
      ret = await SendMentionMessage(target, req.body.user, req.body.message);
    }
  }
  return res.json(ret);
});
//이 부분 나중에 삭제하기!!

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