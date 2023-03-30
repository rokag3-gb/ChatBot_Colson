import {  UspGetWorkCode,} from "../setWorkplace/query"
import { groupChatMap, userMap, insertLog, } from "../common"
import { ValidationToken, ValidationTokenGateway } from "./token"

import { Router } from "restify-router"
import { ActivityTypes, Mention, Activity } from "botbuilder";
import { TeamsBotInstallation, Member, TeamsFx } from "@microsoft/teamsfx"

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

routerInstance.get('/getWorkplace', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }

  const row = await UspGetWorkplaceTeam(req.query["startDate"], req.query["endDate"], req.query["team"]);
  res.json(row);
});

routerInstance.get('/getTeam', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }

  const row = await UspGetTeam(req.query["UPN"]);
  res.json(row);
});

routerInstance.get('/getStore', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }

  const row = await UspGetStore(req.query["search"], req.query["category"]);
  res.json(row);
});

routerInstance.get('/tag', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }

  const row = await UspGetTag(Number(req.query["storeId"]));
  res.json(row);
});

routerInstance.post('/tag', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }
  
  const row = await UspSetTag(Number(req.body["storeId"]), req.body["tag"], req.body["UPN"]);
  res.json(row);
});

routerInstance.del('/tag', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }
  
  const row = await UspDeleteTag(Number(req.query["storeId"]), req.query["tag"], req.query["UPN"]);
  res.json(row);
});

routerInstance.post("/sendUserMessage", async (req, res) => {  
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }
  
  const row = await SendUserMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/setWorkplace", async (req, res) => {  
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }
  
  if(!req.body.workDate || !req.body.upn) {
    return;
  }
  const row = await UspSetWorkplace(req.body.workDate, req.body.upn, req.body.workCodeAM===''?null:req.body.workCodeAM, req.body.workCodePM===''?null:req.body.workCodePM);
  res.json(row);
});

routerInstance.get('/getWorkCode', async (req, res) => {
  if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
    await insertLog('', '인증실패');
  }
  
  const row = await UspGetWorkCode();
  res.json(row);
});

// Message

routerInstance.get("/getGroupChat", async (req, res) => {  
  if (!await ValidationTokenGateway(req.authorization.credentials)) {
    await insertLog('', '인증실패');
  }

  const arr = [];
  for(const data of Object.entries(groupChatMap)) {
    arr.push({
      type: data[1]?.conversationReference?.conversation?.conversationType,
      name: data[1]?.conversationReference?.conversation?.name?data[1]?.conversationReference?.conversation?.name:'일반',
      id: data[1]?.conversationReference?.conversation?.id,
      teamName: data[1]?.TeamName
    });
    console.log(JSON.stringify(data));
  }

  res.json(arr);
});

routerInstance.post("/sendGroupMessage", async (req, res) => {  
  if (!await ValidationTokenGateway(req.authorization.credentials)) {
    await insertLog('', '인증실패');
  }

  const row = await SendGroupMessage(req.body.id, req.body.message);
  res.json(row);
});

routerInstance.post("/sendGroupMentionMessage", async (req, res) => {  
  if (!await ValidationTokenGateway(req.authorization.credentials)) {
    await insertLog('', '인증실패');
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[req.body.id];
  if(!groupChat) {
    res.json({message: "Invalid chat Id"});
  }

  const row = await SendMentionMessage(groupChat, req.body.user, req.body.message);
  res.json(row);
});




const SendUserMessage = async (id: string, message: string) => {
  if(!id || !message) {
    return {message: "Invalid request"};
  }

  const user = <Member>userMap[id];
  console.log(JSON.stringify(groupChatMap));
  if(!user) {
    return {message: "Invalid chat Id"};
  }

  
  const mention: Mention = {
    mentioned: user.account,
    text: `<at> </at>`,
    type: 'mention'
  };

  const message2: Partial<Activity> = {
      entities: [mention],
      text: message.replace('문광석', mention.text),
      type: ActivityTypes.Message
  };

  return await user.sendMessage(<string>message2);
}

const SendGroupMessage = async (id: string, message: string) => {
  if(!id || !message) {
    return {message: "Invalid request"};
  }

  try {
    const groupChat = <TeamsBotInstallation>groupChatMap[id];
    if(!groupChat) {
      return {message: "Invalid chat Id"};
    }
  
    const mentionArr = [];
    let text = message;
    for(let i = 0;;i++) {
      const start = text.indexOf('<mention>');
      const end = text.indexOf('</mention>');
  
      if(start === -1 || end === -1) {
        break;
      }
  
      const upn = text.substring(start+9, end);
  
      let user = <Member>null;
      for (const u of Object.entries(userMap)) {
        if(<string>(u[1].account.userPrincipalName).toLowerCase() === upn.toLowerCase()) {
          user = <Member>u[1];
          break;
        }
      }
  
      if(user === null) {
        text = text.substring(end+10);
        continue;
      }
      
      const mText = text.substring(start, end+10);
      const rText = `<at> ${i} </at>`;
      message = message.replace(mText, rText);
  
      const mention: Mention = {
          mentioned: user.account,
          text: rText,
          type: 'mention'
      };
      mentionArr.push(mention);
      text = text.substring(end+10);
    }
  
    const messageActivity: Partial<Activity> = {
      entities: mentionArr,
      text: message,
      type: ActivityTypes.Message
    };
  
    return await groupChat.sendMessage(<string>messageActivity);
  } catch(e) {
    return {message: "Invalid request"};
  }
}

const SendMentionMessage = async (target: TeamsBotInstallation, username: string, messageText: string) => {
  if(!messageText || !username) {
    return {message: "Invalid request"};
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

  return await target.sendMessage(<string>message);
}