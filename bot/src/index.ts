import * as restify from "restify";
import { bot } from "./internal/initialize";
import { sendMessage, 
         sendCommand, 
         sorryMessage,
         getUserList,
         userRegister,
         insertLog,
         userMap } from "./common";
import { getWorkplaceForm,
         getWorkplace, 
         setWorkplaceForm,
         setWorkplace } from "./workplace";
import { viewSecretMessage,
  sendSecretMessage,
  openSecretMessage, } from "./secretMessage";
  
import { sendBirthdayCard,
  openBirthMessage } from "./birthMessage";

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
  
    if (text[0] === '근무지등록') {
      setWorkplaceForm(req.body.from.id, text[1], 'work');
    } else if (text[0] + text[1] === '근무지등록') {
      setWorkplaceForm(req.body.from.id, text[2], 'work');
    } else if (text[0] === '근무지') {
      getWorkplace(req.body.from.id, text[1], text[2]);
    } else if (text[0] === '홈' || text[0].toLowerCase() === 'home' || text[0] === 'ㅎ') {
      sendCommand(req.body.from.id);
    } else if (text[0] === '메시지' || text[0] === '메세지') {
      viewSecretMessage(req.body, text[1]);
    } else if (text[0] === 'birthTest') {
      sendBirthdayCard();
    } else {
      sorryMessage(req.body.from.id);
    }
  } else if (req.body.value !== undefined && req.body.value !== null) {
    if (req.body.value.messageType === "getWorkplaceForm") {  
      getWorkplaceForm(req.body.from.id);
    } else if (req.body.value.messageType === "getWorkplace") {  
      getWorkplace(req.body.from.id, req.body.value.username, req.body.value.date);
    } else if (req.body.value.messageType === "setWorkplaceForm") {  
      setWorkplaceForm(req.body.from.id, null, 'work');
    } else if (req.body.value.messageType === "setWorkplace") {  
      setWorkplace(req.body);
    } else if (req.body.value.messageType === "viewSecretMessage") {  
      viewSecretMessage(req.body, null);
    } else if (req.body.value.messageType === "sendSecretMessage") {  
      sendSecretMessage(req.body);
    } else if (req.body.value.messageType === "openSecretMessage") {  
      openSecretMessage(req.body);
    } else if (req.body.value.messageType === "openBirthMessage") {  
      openBirthMessage(req.body);
    } else {
      sorryMessage(req.body.from.id);
    }

  } else if(req.body.action !== undefined && req.body.action !== null) {
    if(req.body.action === 'add') {
      sendMessage(req.body.from.id, `반갑습니다. 콜슨 앱이 설치되었습니다.`);
    } else if (req.body.action === 'remove') {
      delete userMap[req.body.from.id];
    }
  } else {
    await sorryMessage(req.body.from.id);
    await sendMessage(req.body.from.id, JSON.stringify(req.body));
  }
  await bot.requestHandler(req, res);
});

//휴가자 제외한 전직원에게 근무지 입력 카드 전송
cron.schedule('00 00 09 * * *', async () => {
  setWorkplaceForm(null, null, 'send');
});

//근무지 입력 안한 사람들에게 카드 전송
cron.schedule('00 00 10 * * *', async () => {  
  setWorkplaceForm(null, null, 'resend');
});

//생일자에게 카드 전송
cron.schedule('00 30 10 * * *', async () => {  
  sendBirthdayCard();
});