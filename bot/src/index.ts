import * as restify from "restify";
import { bot } from "./internal/initialize";
import { getUserList,
         conversationRegister,
         groupRegister,
         getGroupChatList,
         insertLog,
         userCount,
         userMap,
         groupChatMap, } from "./bot/common";
import { TeamsBot } from "./teamsBot";
import { routerInstance } from "./bot/api";
import { initCron } from "./schedule";
import { BotFrameworkAdapter, TurnContext } from "botbuilder";

const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

const initialize = async () => {
  try {
    console.log(' Colson initialize Start! ');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    await conversationRegister(null);

    await getUserList(null);
    await getGroupChatList();
    await initCron();

    await insertLog('initialize', 'Colson initialize Complete!');
  } catch(e) {
      console.log(e);
      await insertLog('initialize', "Error : " + JSON.stringify(e) + ", " + e.message);
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

  await insertLog(context.activity.from.id, "Error : " + JSON.stringify(error) + ', ' + error.message);
  console.log(`The bot encountered unhandled error:\n ${error.message}`);
  await context.sendActivity(`에러가 발생했습니다. 다시 시도해주세요.
  
  ㅤ
  
  ${error.message}`);
};

adapter.onTurnError = onTurnErrorHandler;

// Create the bot that will handle incoming messages.
const teamsBot = new TeamsBot();

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, async () => {
  await insertLog('Bot Started', `${server.name} listening to ${server.url}`);
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.authorizationParser());

server.post("/api/messages", 
async (req, res) => {  
  await insertLog(req.body.from.id, JSON.stringify(req.body));
  if(!req.body.from || !req.body.from.id) {
    await bot.requestHandler(req, res);
    return;
  }
  
  const user = userMap[req.body.from.id];
  if(!user) {
    try {
      await bot.requestHandler(req, res);
      await conversationRegister(req.body.from.id)
      await getUserList(req.body.from.id);
      await getGroupChatList();
    } catch(e) {
      await insertLog(req.body.from.id, "Error : " + JSON.stringify(e) + ", " + e.message);
      console.log(e);
    }
  } else if(userCount === 0) {
    await bot.requestHandler(req, res);
    await conversationRegister(null);
    await getUserList(null);
    await getGroupChatList();
  } else if(req.body.conversation && req.body.conversation.isGroup) {
    await bot.requestHandler(req, res);
    const group = groupChatMap[req.body.conversation.id];
    if(!group) {
      const installations = await bot.notification.installations();
      await groupRegister(installations);
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