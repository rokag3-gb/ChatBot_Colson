import * as restify from "restify";
import { bot } from "./internal/initialize";
import { getUserList,
         userRegister,
         groupRegister,
         getGroupChatList,
         insertLog,
         userCount,
         userMap,
         groupChatMap, } from "./bot/common";
import { TeamsBot } from "./teamsBot";
import { Logger } from "./logger";
import { routerInstance } from "./bot/api";
import { initCron } from "./schedule";
import { BotFrameworkAdapter, TurnContext } from "botbuilder";

import "isomorphic-fetch";

import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential, DefaultAzureCredential } from "@azure/identity";

import axios from 'axios'
import { BasicAuthProvider, createMicrosoftGraphClient, TeamsFx } from "@microsoft/teamsfx";

import { TokenCredentialAuthenticationProvider, TokenCredentialAuthenticationProviderOptions } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";





const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

const initialize = async () => {
  try {
    console.log(' Colson initialize Start! ');
    await userRegister(null);
    await groupRegister(null);

    await getUserList(null);
    await getGroupChatList();
    await initCron();

    insertLog('initialize', 'Colson initialize Complete!');
  } catch(e) {
      Logger.error(JSON.stringify(e));
      console.log(e);
      insertLog('initialize', "Error : " + JSON.stringify(e) + ", " + e.message);
  }
  console.log(' Colson initialize Complete! ');
}

initialize();

const onTurnErrorHandler = async (context: TurnContext, error: Error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  Logger.error(JSON.stringify(error));
  insertLog(context.activity.from.id, "Error : " + JSON.stringify(error) + ', ' + error.message);
  console.log(`The bot encountered unhandled error:\n ${error.message}`);
  await context.sendActivity(`에러가 발생했습니다. 다시 시도해주세요.
  
  ㅤ
  
  ${error.message}`);
};

adapter.onTurnError = onTurnErrorHandler;

// Create the bot that will handle incoming messages.
const teamsBot = new TeamsBot();

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  Logger.info(`\nBot Started, ${server.name} listening to ${server.url}`);
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.oauth2TokenParser());




async function GetToken() {
  const res = await axios.post('https://login.microsoftonline.com/6d5ac8ee-3862-4452-93e7-a836c2d9742b/oauth2/token',
  `grant_type=client_credentials&client_id=912158a0-780e-4e43-95df-a465c5767e18&client_secret=ZjN8Q~-lZFr_R~NV~sNhPfEPZAAg3wtur3xc5c-p&resource=https://graph.microsoft.com/`,
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return res.data.access_token;
}


const chatdata = {
  chatType: 'group',
  topic: '알람 안오는지 테스트하는 그룹채팅방',
  members: [
    {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles: ["owner"],
      'user@odata.bind': "https://graph.microsoft.com/v1.0/users('2cdbeed5-9768-47f4-840d-5ac8e7cb2a6d')"
    },
    {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles: ["owner"],
      'user@odata.bind': "https://graph.microsoft.com/v1.0/users('cdeaad9c-adff-40db-a1d7-eef74ce008ca')"
    }
  ]
}

async function MakeGroupChat(access_token: string) {
  try {
    const res = await axios.post('https://graph.microsoft.com/v1.0/chats', chatdata,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });

    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

async function ChangeGroupChat(access_token: string, teamId: string, channelId: string, ) {
  try {
    const data = {
        'displayName': 'New Channel Name'
    };
    const res = await axios.patch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}`, data,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });

    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

async function ChangeGroupChat2(access_token: string, channelId: string, text: string) {
  try {
    const data = {
        'topic': '\r\n\t\t\t\t\t\t\t\t\t\t\t\t\r\n' + text + '\r\nㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ\r\n'
    };
    const res = await axios.patch(`https://graph.microsoft.com/v1.0/chats/${channelId}`, data,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });

    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

async function SendMessage(access_token: string, teamsId: string, groupChatId: string) {
  try {
    const res = await axios.post('https://graph.microsoft.com/teams/' + teamsId + '/channels/' + groupChatId + '/messages', {
      body: {
        content: '이게 되나?'
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });

    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

async function AddBotApp(access_token: string, teamId: string, channelId: string) {
  try {
    const data = {
      "@odata.type": "microsoft.graph.chatMembership",
      "channelMembershipType":"bot",
      "botId": '67ab75c8-d53a-44bd-9597-53d7dfb99da2'
    };
  
    const res = await axios.post(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/members`, data, 
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });
    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

server.post("/api/messages", 
async (req, res) => {
  Logger.info(JSON.stringify(req.body));
  Logger.info(JSON.stringify(req.headers));
  
  insertLog(req.body.from.id, JSON.stringify(req.body));



 // await createGroup(req.authorization.credentials);

 console.log(req.authorization.credentials);

  /*
  const token = await GetToken();

  console.log('token', token);
  await MakeGroupChat(token);
  //await ChangeGroupChat2(token, '19:e695265abd0549cd9e99dfd74a40e02e@thread.v2', req.body.text);
  //await ChangeGroupChat(token, '912158a0-780e-4e43-95df-a465c5767e18', '19:aa414ea6109641ae85ede3c6e06aeb1e@thread.v2');
//  await AddBotApp(token, '912158a0-780e-4e43-95df-a465c5767e18', '19:9884ee7ce36a43d6bf1484f01e3e0ff0@thread.v2');
  //await SendMessage(token, '2cdbeed5-9768-47f4-840d-5ac8e7cb2a6d', '19:e695265abd0549cd9e99dfd74a40e02e@thread.v2');



  



  const credential = new ClientSecretCredential('6d5ac8ee-3862-4452-93e7-a836c2d9742b', '912158a0-780e-4e43-95df-a465c5767e18', 'ZjN8Q~-lZFr_R~NV~sNhPfEPZAAg3wtur3xc5c-p');
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['Chat.Create', 'openid', 'profile', 'offline_access']
  });

  const client = Client.initWithMiddleware({
      debugLogging: true,
      authProvider
      // Use the authProvider object to create the class.
  });


  await client.api('/chats').post(chatdata);


*/
/*
  const headers = {
    'authorization': 'Bearer ' + req.authorization.credentials,
    'Content-Type': 'application/json'
  }
  console.log('header', JSON.stringify(headers));

  axios.post(`https://graph.microsoft.com/v1.0/chats`, {
    chatType: 'group',
    topic: 'test group chat',
    members: [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ["owner"],
        'user@odata.bind': "https://graph.microsoft.com/v1.0/users('kwangseok.moon@cloudmt.co.kr')"
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ["owner"],
        'user@odata.bind': "https://graph.microsoft.com/v1.0/users('jungwoo.kim@cloudmt.co.kr')"
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ["owner"],
        'user@odata.bind': "https://graph.microsoft.com/v1.0/users('jinho.kim@cloudmt.co.kr')"
      }
    ]
  }, {headers}).then(res => {
    console.log('res ',JSON.stringify(res));
  }).catch(async (err) => {
    console.log('error ',JSON.stringify(err.message));
  });

*/


  if(!req.body.from || !req.body.from.id) {
    await bot.requestHandler(req, res);
    return;
  }
  
  const user = userMap[req.body.from.id];
  if(!user) {
    try {
      await bot.requestHandler(req, res);
      await userRegister(req.body.from.id);
      await getUserList(req.body.from.id);
      await groupRegister(null);
      await getGroupChatList();
    } catch(e) {
      Logger.error(JSON.stringify(e));
      insertLog(req.body.from.id, "Error : " + JSON.stringify(e) + ", " + e.message);
      console.log(e);
    }
  } else if(userCount === 0) {
    await bot.requestHandler(req, res);
    await userRegister(null);
    await getUserList(null);
    await groupRegister(null);
    await getGroupChatList();
  } else if(req.body.conversation && req.body.conversation.isGroup) {
    await bot.requestHandler(req, res);
    const group = groupChatMap[req.body.conversation.id];
    if(!group) {
      await groupRegister(null);
      await getGroupChatList();
    }
  }

  await adapter.processActivity(req, res, async (context) => {
    await teamsBot.run(context);
    await bot.requestHandler(req, res);
  });
});

server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);

function unknownMethodHandler(req, res) {
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With', 'Authorization']; // added Origin & X-Requested-With & **Authorization**

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(200);
 } else {
 }
}

server.on('MethodNotAllowed', unknownMethodHandler);

routerInstance.applyRoutes(server, '/api');