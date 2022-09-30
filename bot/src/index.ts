import * as restify from "restify";
import { bot } from "./internal/initialize";
import { getUserList,
         userRegister,
         insertLog,
         userCount,
         userMap } from "./bot/common";
import { TeamsBot } from "./teamsBot";
import { Logger } from "./logger";

import { routerInstance } from "./bot/api";

import { BotFrameworkAdapter, TurnContext } from "botbuilder";


const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

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
  insertLog(context.activity.from.id, JSON.stringify(error));
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

server.post("/api/messages", 
async (req, res) => {
  Logger.info(JSON.stringify(req.body));
  
  insertLog(req.body.from.id, JSON.stringify(req.body));
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
    } catch(e) {
      Logger.error(JSON.stringify(e));
      insertLog(req.body.from.id, JSON.stringify(e));
      console.log(e);
    }
  } else if(userCount === 0) {
    await bot.requestHandler(req, res);
    await userRegister(null);
    await getUserList(null);
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