import {  UspGetWorkCode,} from "../setWorkplace/query"
import { insertLog, makeGroupObject } from "../common"
import { UspGetGroupChat, UspGetUsersByUPN } from "../common/query"
import { ValidationToken, ValidationTokenGateway } from "./token"

import { Router } from "restify-router"
import { ActivityTypes, Mention, Activity } from "botbuilder";
import { TeamsBotInstallation, Member } from "@microsoft/teamsfx"

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
export const routerInstanceGateway = new Router();

const ValidationTokenFunc = async (req, res, func) => {
  try {
    if (!await ValidationToken(req.authorization.credentials, req.getUrl().path)) {
      await insertLog('', '인증실패');
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    await func();

  } catch (e) {
    await insertLog('', "Error : " + JSON.stringify(e) + ", " + e?.message);
    res.json({message: "Invalid request ValidationTokenFunc"});
  }
}

const ValidationGatewayFunc = async (req, res, func) => {
  try {
    if (!await ValidationTokenGateway(req.authorization.credentials)) {
      await insertLog('', '인증실패');
    }
    
    await func();

  } catch (e) {
    await insertLog('', "Error : " + JSON.stringify(e) + ", " + e?.message);
    res.json({message: "Invalid request ValidationGatewayFunc"});
  }
}

routerInstance.get('/getWorkplace', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspGetWorkplaceTeam(req.query["startDate"], req.query["endDate"], req.query["team"]);
    res.json(row);
  });
});

routerInstance.get('/getTeam', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspGetTeam(req.query["UPN"]);
    res.json(row);
  });
});

routerInstance.get('/getStore', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspGetStore(req.query["search"], req.query["category"]);
    res.json(row);
  });
});

routerInstance.get('/tag', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspGetTag(Number(req.query["storeId"]));
    res.json(row);
  });
});

routerInstance.post('/tag', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspSetTag(Number(req.body["storeId"]), req.body["tag"], req.body["UPN"]);
    res.json(row);
  });
});

routerInstance.del('/tag', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspDeleteTag(Number(req.query["storeId"]), req.query["tag"], req.query["UPN"]);
    res.json(row);
  });
});

routerInstance.post("/setWorkplace", async (req, res) => {  
  await ValidationTokenFunc(req, res, async () => {
    if(!req.body.workDate || !req.body.upn) {
      return;
    }
    const row = await UspSetWorkplace(req.body.workDate, req.body.upn, req.body.workCodeAM===''?null:req.body.workCodeAM, req.body.workCodePM===''?null:req.body.workCodePM);
    res.json(row);
  });
});

routerInstance.get('/getWorkCode', async (req, res) => {
  await ValidationTokenFunc(req, res, async () => {
    const row = await UspGetWorkCode();
    res.json(row);
  });
});

routerInstanceGateway.get("/getGroupChat", async (req, res) => {  
  await ValidationGatewayFunc(req, res, async () => {
    try {
      const groupChatList = await UspGetGroupChat();
      const arr = [];
      for(const data of Object.entries(groupChatList)) {
        arr.push({
          type: data[1]?.conversationReference?.conversation?.conversationType,
          name: data[1]?.conversationReference?.conversation?.name?data[1]?.conversationReference?.conversation?.name:'일반',
          id: data[1]?.conversationReference?.conversation?.id,
          teamName: data[1]?.TeamName
        });
        console.log(JSON.stringify(data));
      }
    
      res.json(arr);
    } catch(e) {
      res.json(500, 'Internal Server Error (getGroupChat)');
    }
  });
});

routerInstanceGateway.post("/sendUserMessage", async (req, res) => {
  await ValidationGatewayFunc(req, res, async () => {
    const row = await SendUserMessage(req.body.user, req.body.message);
    res.json(row.code, row.message);
  });
});

routerInstanceGateway.post("/sendGroupMessage", async (req, res) => {  
  await ValidationGatewayFunc(req, res, async () => {
    const row = await SendGroupMessage(req.body.id, req.body.message);
    res.json(row.code, row.message);
  });
});

const SendUserMessage = async (userInfo: string, message: string) => {
  if(!userInfo || !message) {
    throw new Error('Invalid request (user or message)');
  }

  const user = <Member>(await UspGetUsersByUPN(userInfo))  
  if(user === null) {
    throw new Error('Invalid request (user is null)');
  }
  
  try {
    const messageActivity = await MakeMessage(message);  
    const result = await user.sendMessage(<string>messageActivity);

    return {message: result, code: 200};
  } catch(e) {
    return {message: e.message, code: 500};
  }
}

const SendGroupMessage = async (id: string, message: string) => {
  if(!id || !message) {
    return {message: "Invalid request (id, message)", code: 400};
  }

  try {
    const groupChat = await makeGroupObject(id);
    if(!groupChat) {
      return {message: "Invalid chat Id", code: 400};
    }

    const messageActivity = await MakeMessage(message);
  
    const result =  await groupChat.sendMessage(<string>messageActivity);
    return {message: result, code: 200};
  } catch(e) {
    return {message: "Invalid request (" + e.message+")", code: 500};
  }
}

const MakeMessage = async (message: string):Promise<Partial<Activity>>  => {  
  const mentionArr = [];
  let text = message;
  for(let i = 0;;i++) {
    const start = text.indexOf('<mention>');
    const end = text.indexOf('</mention>');

    if(start === -1 || end === -1) {
      break;
    }

    const userInfo = text.substring(start+9, end);

    const user = <Member>(await UspGetUsersByUPN(userInfo))  
    if(user === null) {
      throw new Error('Invalid request (user is null)');
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

  return messageActivity;
}