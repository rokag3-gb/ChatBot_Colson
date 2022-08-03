import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardData } from "./model/cardModels";
import viewSecretMessageTemplate from "./adaptiveCards/viewSecretMessage.json";
import openSecretMessageTemplate from "./adaptiveCards/openSecretMessage.json";
import sendSecretMessageTemplate from "./adaptiveCards/sendSecretMessage.json";
import { CardFactory } from "botbuilder";

import { sql } from "./mssql"
import { userMap } from "./common";
         
export const viewSecretMessage = async (id, receiverName) => {
  sendSecretMessageTemplate.body[4].choices.length = 0;

  for (const user of Object.entries(userMap)) {
    if(id === user[1].account.id)
      continue;
    sendSecretMessageTemplate.body[4].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      sendSecretMessageTemplate.body[4].value = user[1].account.id;
    }
  }

  const user = userMap[id];
  user.sendAdaptiveCard(
    AdaptiveCards.declare(sendSecretMessageTemplate).render()
  );
}

export const sendSecretMessage = async (id, receiverId, senderNick, message) => {
  const user = userMap[id];
  const receiver = userMap[receiverId];

  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('Sender', sql.VarChar, user.account.userPrincipalName);
  request.input('SenderNick', sql.VarChar, senderNick);
  request.input('Receiver', sql.VarChar, receiver.account.userPrincipalName);
  request.input('Contents', sql.VarChar, message);

  const query = `[IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  }).on('row', (row) => {
    if(row.ID === -1) {
      user.sendMessage(row.ERROR);
      return;
    }
    user.sendMessage(`${receiver.account.name} 님에게 메시지가 전송되었습니다.
    
    (일일 남은 횟수 : ${row.SendCount})`);

    openSecretMessageTemplate.actions[0].data.messageId = row.ID;    
    receiver.sendAdaptiveCard(
      AdaptiveCards.declare(openSecretMessageTemplate).render()
    );
  });
}

export const openSecretMessage = async (id, messageId) => {
  const request = new sql.Request();
  request.input('MsgId', sql.BigInt, messageId);

  const query = `[IAM].[bot].[Usp_Get_Send_Message] @MsgId`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  }).on('row', async (row) => {
    const user = userMap[id];
    user.sendAdaptiveCard(
      AdaptiveCards.declare<CardData>(viewSecretMessageTemplate).render({
        title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
        body: row.Contents,
        date: ``,
      })
    );

    const sender = userMap[row.AppUserId];
    //어이없네 bit 타입을 insert 할때는 0, 1로 안보내면 에러나더니 select 할때는 true, false 로 받아야 처리가 가능하다
    if(row.IsOpen === false && sender !== undefined && sender !== null) {
      sender.sendMessage(`${user.account.name} 님이 메시지를 열어보았습니다.`);
    }
  });
}