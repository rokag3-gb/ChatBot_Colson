import * as restify from "restify";
import { bot } from "./internal/initialize";
import { sendMessage, 
         sendCommand, 
         sendUserList, 
         getWorkSchedule, 
         sorryMessage,
         getUserList,
         userRegister,
         insertLog,
         sendWorkplace,
         insertWorkplace,
         findWorkplace,
         notFoundWorkplace,
         userMap } from "./common"
import { connected } from "./mssql"

const cron = require('node-cron');

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
  if(req.body.from === undefined || req.body.from === null || req.body.from.id === undefined || req.body.from.id === null) {
    await bot.requestHandler(req, res);
    return;
  }
  
  const user = userMap[req.body.from.id];
  if(user === undefined || user === null) {
    try {
      await userRegister(req.body.from.id);
      await getUserList(req.body.from.id);
    } catch(e) {
      console.log(e);
    }
  }

  if(req.body.text !== undefined && req.body.text !== null && req.body.text != '') {
    const text = req.body.text.trim().split(" ");
  
    if (text[0] === '스케줄') {
      getWorkSchedule(req.body.from.id, text[1], text[2]);
    } else if (text[0]+text[1] === '명령모아보기') {
      sendCommand(req.body.from.id);
    } else if (text[0] === '스케줄입력') {
      await sendMessage(req.body.from.id, `스케줄 입력을 선택하셨습니다.`);
      sendWorkplace(req.body.from.id, findWorkplace);
    } else {
      sorryMessage(req.body.from.id);
    }

  } else if (req.body.value !== undefined && req.body.value !== null) {
    if (req.body.value.messageType === "getSchedule") {  
      sendUserList(req.body.from.id);
    } else if (req.body.value.messageType === "insertSchedule") {  
      await sendMessage(req.body.from.id, `스케줄 입력을 선택하셨습니다.`);
      sendWorkplace(req.body.from.id, findWorkplace);
    } else if (req.body.value.messageType === "schedule") {  
      if(req.body.value.username !== undefined) {
        getWorkSchedule(req.body.from.id, req.body.value.username, req.body.value.date);
      } else {
        sendMessage(req.body.from.id, `조회하실 분의 이름을 선택하고 다시 조회해주세요.`);
      }
    } else if (req.body.value.messageType === "workplace") {  
      insertWorkplace(req.body.from.id, req.body.value);
    } else {
      sorryMessage(req.body.from.id);
    }

  } else if(req.body.action !== undefined && req.body.action !== null) {
    if(req.body.action === 'add') {
      sendMessage(req.body.from.id, `반갑습니다. 콜슨 앱이 설치되었습니다.`);
    } else if (req.body.action === 'remove') {
    }
  } else {
    await sorryMessage(req.body.from.id);
    await sendMessage(req.body.from.id, JSON.stringify(req.body));
  }
  await bot.requestHandler(req, res);
});

//휴가자 제외한 전직원에게 스케줄 입력 카드 전송
cron.schedule('00 00 09 * * *', async () => {  
  sendWorkplace(null, findWorkplace);
});

//스케줄 입력 안한 사람들에게 카드 전송
cron.schedule('00 00 10 * * *', async () => {  
  sendWorkplace(null, notFoundWorkplace);
});