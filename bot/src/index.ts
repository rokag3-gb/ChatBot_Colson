import * as restify from "restify";
import { bot } from "./internal/initialize";
import { getUserList,
         userRegister,
         insertLog,
         userMap } from "./common";
import { setWorkplaceForm } from "./workplace";
  
import { sendBirthdayCard } from "./birthMessage";

import { connected } from "./mssql"

import { TeamsBot } from "./teamsBot";

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

  console.log(`The bot encountered unhandled error:\n ${error.message}`);
  await context.sendActivity(`죄송해요. 서버에서 에러가 났어요. 다시 시도해주세요.
  
  ㅤ
  
  {${error.message}}`);
};

adapter.onTurnError = onTurnErrorHandler;

// Create the bot that will handle incoming messages.
const teamsBot = new TeamsBot();

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

server.post("/api/messages", 
restify.plugins.queryParser(),
restify.plugins.bodyParser(),
async (req, res) => {
  console.log(JSON.stringify(req.body));
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
      console.log(e);
    }
  }

  await adapter.processActivity(req, res, async (context) => {
    await teamsBot.run(context);
    await bot.requestHandler(req, res);
  });
});

//휴가자 제외한 전직원에게 근무지 입력 카드 전송
cron.schedule('00 00 09 * * *', async () => {
  setWorkplaceForm(null, null, 'send', '좋은 아침입니다!');
});

//근무지 입력 안한 사람들에게 카드 전송
cron.schedule('00 00 10 * * *', async () => {  
  setWorkplaceForm(null, null, 'resend', '좋은 아침입니다!');
});

cron.schedule('00 00 14 * * *', async () => {
  setWorkplaceForm(null, null, 'resend', '점심 식사 맛있게 하셨나요!');
});

cron.schedule('00 30 17 * * *', async () => {  
  setWorkplaceForm(null, null, 'send', '오늘 하루도 고생많으셨습니다.');
});

//생일자에게 카드 전송
cron.schedule('00 30 10 * * *', async () => {  
  sendBirthdayCard();
});