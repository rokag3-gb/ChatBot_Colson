import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardData } from "./model/cardModels";
import viewSecretMessageTemplate from "./adaptiveCards/viewSecretMessage.json";
import openSecretMessageTemplate from "./adaptiveCards/openSecretMessage.json";
import sendSecretMessageTemplate from "./adaptiveCards/sendSecretMessage.json";

import { sql } from "./mssql"
import { userMap } from "./common";         

export const checkSecretMessage = async (body, receiverName) => {
  sendSecretMessageTemplate.body[2].choices.length = 0;

  for (const user of Object.entries(userMap)) {
    sendSecretMessageTemplate.body[2].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      sendSecretMessageTemplate.body[2].value = user[1].account.id;
    }
  }

  const user = userMap[body.from.id];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(sendSecretMessageTemplate).render({
      title: '',
      body: '',
      date: ``,
    })
  );
}
         
export const viewSecretMessage = async (body, receiverName) => {
  sendSecretMessageTemplate.body[2].choices.length = 0;

  for (const user of Object.entries(userMap)) {
    sendSecretMessageTemplate.body[2].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      sendSecretMessageTemplate.body[2].value = user[1].account.id;
    }
  }

  const user = userMap[body.from.id];
  user.sendAdaptiveCard(
    AdaptiveCards.declare(sendSecretMessageTemplate).render()
  );
}

export const sendSecretMessage = async (body) => {
  const user = userMap[body.from.id];
  const receiver = userMap[body.value.receiver];

  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('Sender', sql.VarChar, user.account.userPrincipalName);
  request.input('SenderNick', sql.VarChar, body.value.senderNick);
  request.input('Receiver', sql.VarChar, receiver.account.userPrincipalName);
  request.input('Contents', sql.VarChar, body.value.message);

  const query = `[IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {
    if(row.ID === -1) {
      user.sendMessage('오늘 이미 3번의 메세지를 전송하셨습니다.');
      return;
    }
    user.sendMessage('메세지가 전송되었습니다.');

    openSecretMessageTemplate.actions[0].data.messageId = row.ID;    
    receiver.sendAdaptiveCard(
      AdaptiveCards.declare(openSecretMessageTemplate).render()
    );
  });
}

export const openSecretMessage = async (body) => {
  const request = new sql.Request();
  request.input('MsgId', sql.BigInt, body.value.messageId);

  const query = `[IAM].[bot].[Usp_Get_Send_Message] @MsgId`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {
    const user = userMap[body.from.id];
    user.sendAdaptiveCard(
      AdaptiveCards.declare<CardData>(viewSecretMessageTemplate).render({
        title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
        body: row.Contents,
        date: ``,
      })
    );

    const receiver = userMap[row.AppUserId];
    //어이없네 bit 타입을 insert 할때는 0, 1로 안보내면 에러나더니 select 할때는 true, false 로 받아야 처리가 가능하다
    if(row.IsOpen === false && receiver !== undefined && receiver !== null) {
      receiver.sendMessage(`${user.account.name} 님이 메세지를 열어보았습니다.`);
    }
  });
}