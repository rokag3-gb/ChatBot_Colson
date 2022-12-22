import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { SecretSendCardData, SecretCardData, SecretOpenCardData } from "../../model/cardModels";
import viewSecretMessageTemplate from "../../adaptiveCards/viewSecretMessage.json";
import openSecretMessageTemplate from "../../adaptiveCards/openSecretMessage.json";
import sendSecretMessageTemplate from "../../adaptiveCards/sendSecretMessage.json";
import { CardFactory } from "botbuilder";
import { errorMessageForContext } from "../common"
import ACData = require("adaptivecards-templating");

import { userMap } from "../common";
import { UspSetSendMessage, UspGetSendMessage, UspSetSendMessageOpen, UspGetSendMessageChatid } from "./query";

import { secretMessageIcon1,
  secretMessageIcon2,
  secretMessageIcon3,
  secretMessageBackground1,
  secretMessageBackground2,
  secretMessageBackground3,} from "../../image"
         
export const viewSecretMessage = async (context, id, receiverName) => {
  const tmpTemplate = JSON.parse(JSON.stringify(sendSecretMessageTemplate));

  for (const user of Object.entries(userMap)) {
    if(id === user[1].account.id || !user[1].FullNameKR || typeof user[1].FullNameKR !== 'string')
      continue;
      
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
  const user = userMap[id];
  const receiver = userMap[receiverId]; 
  const tmpTemplate = JSON.parse(JSON.stringify(sendSecretMessageTemplate));

  for (const user of Object.entries(userMap)) {
    if(id === user[1].account.id || !user[1].FullNameKR || typeof user[1].FullNameKR !== 'string')
      continue;
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

  const rows = await UspSetSendMessage(user.account.userPrincipalName, senderNick, receiver.account.userPrincipalName, message, background);
  for(const row of rows) {
    if(row.ID === -1) {
      await errorMessageForContext(context, row.ERROR);
    }
    await context.sendActivity(`${receiver.FullNameKR} 님에게 메시지가 전송되었습니다. (일일 남은 횟수 : ${row.SendCount})`);
    const tmpTemplate = JSON.parse(JSON.stringify(openSecretMessageTemplate));
    tmpTemplate.actions[0].data.messageId = row.ID;    
  
    await receiver.sendAdaptiveCard<SecretOpenCardData>(AdaptiveCards.declare(tmpTemplate).render({
      Receiver: receiver.FirstNameKR
    }));
  }
}

export const openSecretMessage = async (context, id, messageId) => {
  const rows = await UspGetSendMessage(messageId);
  for(const row of rows) {
    if(row.IsOpen === true) {
      await context.sendActivity("이미 열어본 메세지입니다.");
      return;
    }
    let background = '';

    if (row.Background === 'green' || row.Background === 'White Snow') {
      background = secretMessageBackground2;
    } else if (row.Background === 'brown' || row.Background === 'Twinkle Orange') {
      background = secretMessageBackground3;
    } else {
      background = secretMessageBackground1;
    }

    const replacer = new RegExp('\n', 'g');
    const card = AdaptiveCards.declare<SecretCardData>(viewSecretMessageTemplate).render({
      background: background,
      title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
      body: row.Contents.replace(replacer, '\n\n')
    });
    const openedChatId = await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    await UspSetSendMessageOpen(messageId, openedChatId.id);

    const user = userMap[id];
    const sender = userMap[row.AppUserId];

    //어이없네 bit 타입을 insert 할때는 0, 1로 안보내면 에러나더니 select 할때는 true, false 로 받아야 처리가 가능하다
    if(sender) {
      await sender.sendMessage(`${user.FullNameKR} 님이 메시지를 열어보았습니다.`);
    }
  }
}

export const sendMessageReaction = async (context, id, activityId, type: string) => {
  const rows = await UspGetSendMessageChatid(activityId);
  for(const row of rows) {
    const user = userMap[id];
    const sender = userMap[row.AppUserId];
    if(!sender) {
      return;
    }

    let icon = '';

    if(type.includes("_")) {
      const code = type.split("_");
      icon = String.fromCodePoint(parseInt(code[0], 16))
    } else if(type === 'like') {
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

    if(icon === '') {
      icon = "(" + type + ")";
    }
    await sender.sendMessage(`${user.FullNameKR} 님이 메시지에 ${icon} 반응했습니다.`);
    await context.sendActivity(`${row.SenderNick} 님에게 ${icon} 반응이 전달되었습니다.`);
  }
}

const makeData = async (senderNick, receiver, message, background) => {
  const icon1 = secretMessageIcon1;
  const icon2 = secretMessageIcon2;
  const icon3 = secretMessageIcon3

  let data: SecretSendCardData;
  let backgroundImage = background;
  if(!backgroundImage) {
    backgroundImage = "Yellow Tree";
  }

  data = {
    Icon1: icon1,
    Icon2: icon2,
    Icon3: icon3,
    IconName1: "Yellow Tree",
    IconName2: "White Snow",
    IconName3: "Twinkle Orange",
    backgroundImage: backgroundImage,
    backgroundImage01: "Yellow Tree",
    backgroundImage02: "White Snow",
    backgroundImage03: "Twinkle Orange",
    senderNick: senderNick,
    receiver: receiver,
    contents: message,
  };
  
  return data;
}