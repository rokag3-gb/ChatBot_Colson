import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { SecretCardData, SecretOpenCardData } from "./model/cardModels";
import viewSecretMessageTemplate from "./adaptiveCards/viewSecretMessage.json";
import openSecretMessageTemplate from "./adaptiveCards/openSecretMessage.json";
import sendSecretMessageTemplate from "./adaptiveCards/sendSecretMessage.json";
import { CardFactory } from "botbuilder";

import { sql } from "./mssql"
import { userMap, sendMessage } from "./common";
         
export const viewSecretMessage = async (id, receiverName) => {
  const tmpTemplate = JSON.parse(JSON.stringify(sendSecretMessageTemplate));

  for (const user of Object.entries(userMap)) {
    if(id === user[1].account.id)
      continue;
    tmpTemplate.body[4].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      tmpTemplate.body[4].value = user[1].account.id;
    }
  }

  const user = userMap[id];
  await user.sendAdaptiveCard(
    AdaptiveCards.declare(tmpTemplate).render()
  );
}

export const sendSecretMessage = async (id, receiverId, senderNick, message) => {
  const user = userMap[id];
  const receiver = userMap[receiverId];

  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('Sender', sql.VarChar, user.account.userPrincipalName);
  request.input('SenderNick', sql.NVarChar, senderNick);
  request.input('Receiver', sql.VarChar, receiver.account.userPrincipalName);
  request.input('Contents', sql.NVarChar, message);

  const query = `[IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  }).on('row', async (row) => {
    if(row.ID === -1) {
      user.sendMessage(row.ERROR);
      return;
    }
    user.sendMessage(`${receiver.account.name} 님에게 메시지가 전송되었습니다. (일일 남은 횟수 : ${row.SendCount})`);

    const tmpTemplate = JSON.parse(JSON.stringify(openSecretMessageTemplate));
    tmpTemplate.actions[0].data.messageId = row.ID;    
    await receiver.sendAdaptiveCard<SecretOpenCardData>(AdaptiveCards.declare(tmpTemplate).render({
      Receiver: receiver.account.name
    }));
  });
}

export const openSecretMessage = async (id, messageId, context) => {
  return new Promise((resolve, reject) => {
    try {
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
        if(row.IsOpen === true) {
          await sendMessage(id, "이미 열어본 메세지입니다.");
          resolve(true);
          return;
        }

        const replacer = new RegExp('\n', 'g');
        const card = AdaptiveCards.declare<SecretCardData>(viewSecretMessageTemplate).render({
          title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
          body: row.Contents.replace(replacer, '\n\n')
        });
        const openedChatId = await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
        await openMessage(messageId, openedChatId.id);
    
        const user = userMap[id];
        const sender = userMap[row.AppUserId];

        //어이없네 bit 타입을 insert 할때는 0, 1로 안보내면 에러나더니 select 할때는 true, false 로 받아야 처리가 가능하다
        if(sender) {
          sender.sendMessage(`${user.account.name} 님이 메시지를 열어보았습니다.`);
        }

        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

const openMessage = async (messageId, openedChatId) => {
  const request = new sql.Request();
  
  request.input('MsgId', sql.BigInt, messageId);
  request.input('OpenedChatId', sql.VarChar, openedChatId);

  const query = `[IAM].[bot].[Usp_Set_Send_Message_Open] @MsgId, @OpenedChatId`;

  request.query(query, (err, result) => {
    if(err){
      return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  });
}

export const sendMessageReaction = async (id, activityId, type) => {
  const request = new sql.Request();
  
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('OpenedChatId', sql.VarChar, activityId);

  const query = `[IAM].[bot].[Usp_Get_Send_Message_Chat_Id] @OpenedChatId, @AppId`;

  request.query(query, (err, result) => {
    if(err){
      return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  }).on('row', async (row) => {
    const user = userMap[id];
    const sender = userMap[row.AppUserId];
    if(!sender || !user) {
      return;
    }

    let icon = '';
    
    if(type === 'like') {
      icon = '👍';
    } else if(type === 'heart') {
      icon = '❤️';
    } else if(type === 'laugh') {
      icon = '😆';
    } else if(type === 'surprised') {
      icon = '😮';
    } else if(type === 'sad') {
      icon = '🙁';
    } else if(type === 'angry') {
      icon = '😡';
    }

    await sender.sendMessage(`${user.account.name} 님이 메시지에 '${icon}' 반응했습니다.`);
    await user.sendMessage(`${row.SenderNick} 님에게 '${icon}' 반응이 전달되었습니다.`)
  });
}