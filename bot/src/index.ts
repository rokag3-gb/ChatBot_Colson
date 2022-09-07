import * as restify from "restify";
import { bot } from "./internal/initialize";
import { getUserList,
         userRegister,
         insertLog,
         userCount,
         userMap } from "./bot/common";
import { setWorkplaceForm } from "./bot/setWorkplace";
  
import { sendBirthdayCard } from "./bot/birthMessage";

import { connected } from "./mssql"

import { TeamsBot } from "./teamsBot";

import { UspGetWorkplace, UspGetWorkplaceTest } from "./bot/getWorkplace/query";

import { UspGetTeam } from "./bot/common/query";

const cron = require('node-cron');

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
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

server.post("/api/messages", 
restify.plugins.bodyParser(),
restify.plugins.authorizationParser(),
async (req, res) => {
//  console.log(JSON.stringify(req.body));

  if(!connected) {
    console.log('server not initialized');
    await bot.requestHandler(req, res);
    return;
  }
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

server.get("/api/getWorkplace", 
restify.plugins.queryParser(),
async (req, res) => {
  console.log('요청이 들어왓음 ',req.query["startDate"], req.query["endDate"], req.query["team"]);
  
  const row = await UspGetWorkplaceTest(req.query["startDate"], req.query["endDate"], req.query["team"]);
  res.json(row);
});

server.get("/api/getTeam", 
restify.plugins.queryParser(),
async (req, res) => {
  console.log('요청이 들어왓음Team ' + req.query["UPN"]);
  
  const row = await UspGetTeam(req.query["UPN"]);
  res.json(row);
});

server.get("/api/getWorkplace2", 
restify.plugins.bodyParser(),
restify.plugins.authorizationParser(),
async (req, res) => {
  console.log('요청이 들어왓음2');
  
  const row = await UspGetWorkplace('문광석', <any>7);
  res.json(row);
});

//앱서비스의 기본 시간대가 UTC 기준이고 이게 생각보다 자주 초기화 되어서 UTC 기준으로 크론을 작성함
//휴가자 제외한 전직원에게 근무지 입력 카드 전송
cron.schedule('00 00 00 * * *', async () => {
  await setWorkplaceForm(null, null, null, 'send', '좋은 아침입니다!', 'am');
});

//근무지 입력 안한 사람들에게 카드 전송
cron.schedule('00 00 1 * * *', async () => {  
  await setWorkplaceForm(null, null, null, 'resend', '좋은 아침입니다!', 'am');
});

cron.schedule('00 00 05 * * *', async () => {
  await setWorkplaceForm(null, null, null, 'resend', '점심 식사 맛있게 하셨나요!', null);
});

cron.schedule('00 30 08 * * *', async () => {  
  await setWorkplaceForm(null, null, null, 'send', '오늘 하루도 고생많으셨습니다.', 'pm');
});

//생일자에게 카드 전송
cron.schedule('00 30 01 * * *', async () => {  
  await sendBirthdayCard();
});

/*테스트코드*/
/*
cron.schedule('00 50 06 * * *', async () => {
  console.time('schedule');
  await setWorkplaceFormTest(null, null, null, 'send', '좋은 아침입니다!', 'am');
  console.timeEnd('schedule');
});
*/