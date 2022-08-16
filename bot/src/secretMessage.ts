import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { SecretSendCardData, SecretCardData, SecretOpenCardData } from "./model/cardModels";
import viewSecretMessageTemplate from "./adaptiveCards/viewSecretMessage.json";
import openSecretMessageTemplate from "./adaptiveCards/openSecretMessage.json";
import sendSecretMessageTemplate from "./adaptiveCards/sendSecretMessage.json";
import { CardFactory } from "botbuilder";
import { imgPath, errorMessageForContext } from "./common"
import workplaceUserListTemplate from "./adaptiveCards/workplaceUserList.json";
import ACData = require("adaptivecards-templating");

import { sql } from "./mssql"
import { userMap } from "./common";
import imageToBase64 from "image-to-base64";

const makeData = async (senderNick, receiver, message, background) => {
  const icon1 = await imageToBase64(imgPath + "background_icon_01.jpg")
  const icon2 = await imageToBase64(imgPath + "background_icon_02.jpg");
  const icon3 = await imageToBase64(imgPath + "background_icon_03.jpg");

  let data: SecretSendCardData;
  let backgroundImage = background;
  if(!backgroundImage) {
    backgroundImage = "background_01.jpg";
  }

  data = {
    Icon1: icon1,
    Icon2: icon2,
    Icon3: icon3,
    IconName1: "yellow",
    IconName2: "green",
    IconName3: "brown",
    backgroundImage: backgroundImage,
    backgroundImage01: "background_01.jpg",
    backgroundImage02: "background_02.jpg",
    backgroundImage03: "background_03.jpg",
    senderNick: senderNick,
    receiver: receiver,
    contents: message,
  };
  
  return data;
}
         
export const viewSecretMessage = async (context, id, receiverName) => {
  const tmpTemplate = JSON.parse(JSON.stringify(sendSecretMessageTemplate));

  for (const user of Object.entries(userMap)) {
 //   if(id === user[1].account.id)
 //     continue;
    tmpTemplate.body[3].columns[1].items[0].choices.push({
      "title": user[1].FullNameKR,
      "value": user[1].account.id
    });

    tmpTemplate.body[3].columns[1].items[0].choices.sort((a, b) => {
      return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
    });

    if(receiverName === user[1].FullNameKR) {
      tmpTemplate.body[3].columns[1].items[0].value = user[1].account.id;
    }
  }

  const card = AdaptiveCards.declare(tmpTemplate).render(await makeData(null, receiverName, null, null));
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

export const sendSecretMessage = async (context, id, receiverId, senderNick, message, background) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = userMap[id];
      const receiver = userMap[receiverId]; 
      const tmpTemplate = JSON.parse(JSON.stringify(sendSecretMessageTemplate));
    
      for (const user of Object.entries(userMap)) {
  //      if(id === user[1].account.id)
  //        continue;
        tmpTemplate.body[3].columns[1].items[0].choices.push({
          "title": user[1].FullNameKR,
          "value": user[1].account.id
        });

        tmpTemplate.body[3].columns[1].items[0].choices.sort((a, b) => {
          return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
        });
    
        if(context.activity.value.receiver === user[1].FullNameKR) {
          tmpTemplate.body[3].columns[1].items[0].value = user[1].account.id;
        }
      }
    
      const cardTemplate = new ACData.Template(tmpTemplate);
      const cardWithData = cardTemplate.expand({ $root: await makeData(context.activity.value.senderNick, context.activity.value.receiver, context.activity.value.message, background) });
      const card = CardFactory.adaptiveCard(cardWithData);

      await context.updateActivity({
        type: "message",
        id: context.activity.replyToId,
        attachments: [card],
      });

      const request = new sql.Request();
      request.input('AppId', sql.VarChar, process.env.BOT_ID);
      request.input('Sender', sql.VarChar, user.account.userPrincipalName);
      request.input('SenderNick', sql.NVarChar, senderNick);
      request.input('Receiver', sql.VarChar, receiver.account.userPrincipalName);
      request.input('Contents', sql.NVarChar, message);
      request.input('Background', sql.VarChar, background);
    
      const query = `[IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents, @Background`;
    
      request.query(query, async (err, result) => {
        if(err) {
          await errorMessageForContext(context, err);
          reject(err);
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', async (row) => {
        try {
          if(row.ID === -1) {
            await errorMessageForContext(context, row.ERROR);
          }
         await context.sendActivity(`${receiver.FullNameKR} 님에게 메시지가 전송되었습니다. (일일 남은 횟수 : ${row.SendCount})`);
      
         const tmpTemplate = JSON.parse(JSON.stringify(openSecretMessageTemplate));
         tmpTemplate.actions[0].data.messageId = row.ID;    
      
         await receiver.sendAdaptiveCard<SecretOpenCardData>(AdaptiveCards.declare(tmpTemplate).render({
           Receiver: receiver.FirstNameKR
         }));
         resolve(true);
        } catch(e) {
          reject(e);
        }
      });
    } catch(e) {
      await errorMessageForContext(context, e);
      reject(e);
    }
  });
}

export const openSecretMessage = async (context, id, messageId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('MsgId', sql.BigInt, messageId);
      const query = `[IAM].[bot].[Usp_Get_Send_Message] @MsgId`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', async (row) => {   
        try {
          if(row.IsOpen === true) {
            await context.sendActivity("이미 열어본 메세지입니다.");
            resolve(true);
            return;
          }
          let background = '';
          try {
            background = await imageToBase64(imgPath + row.Background);
          } catch {
            background = await imageToBase64(imgPath + "background_01.jpg");
          }
  
          const replacer = new RegExp('\n', 'g');
          const card = AdaptiveCards.declare<SecretCardData>(viewSecretMessageTemplate).render({
            background: background,
            title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
            body: row.Contents.replace(replacer, '\n\n')
          });
          const openedChatId = await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          await openMessage(context, messageId, openedChatId.id);
      
          const user = userMap[id];
          const sender = userMap[row.AppUserId];
  
          //어이없네 bit 타입을 insert 할때는 0, 1로 안보내면 에러나더니 select 할때는 true, false 로 받아야 처리가 가능하다
          if(sender) {
            await sender.sendMessage(`${user.FullNameKR} 님이 메시지를 열어보았습니다.`);
          }
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
}

const openMessage = (context, messageId, openedChatId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      
      request.input('MsgId', sql.BigInt, messageId);
      request.input('OpenedChatId', sql.VarChar, openedChatId);
    
      const query = `[IAM].[bot].[Usp_Set_Send_Message_Open] @MsgId, @OpenedChatId`;
    
      request.query(query, (err, result) => {
        if(err){
          reject(err);
          return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('done', () => { 
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export const sendMessageReaction = (context, id, activityId, type) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      
      request.input('AppId', sql.VarChar, process.env.BOT_ID);
      request.input('OpenedChatId', sql.VarChar, activityId);
    
      const query = `[IAM].[bot].[Usp_Get_Send_Message_Chat_Id] @OpenedChatId, @AppId`;
    
      request.query(query, (err, result) => {
        if(err){
          return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', async (row) => {
        try {
          const user = userMap[id];
          const sender = userMap[row.AppUserId];
          if(!sender) {
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
      
          await sender.sendMessage(`${user.FullNameKR} 님이 메시지에 '${icon}' 반응했습니다.`);
          await context.sendActivity(`${row.SenderNick} 님에게 '${icon}' 반응이 전달되었습니다.`)
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
}