import { TeamsActivityHandler, MessageFactory, ActivityTypes, CardFactory, TurnContext } from "botbuilder";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { viewCommandList, sendCommand, userMap, sorryMessage } from "./bot/common";
import { setWorkplaceForm, setWorkplace } from "./bot/setWorkplace";
import { getWorkplaceForm, getWorkplace } from "./bot/getWorkplace";
import { viewSecretMessage, sendSecretMessage, openSecretMessage, sendMessageReaction } from "./bot/secretMessage";
import { sendBirthdayCard, openBirthMessage } from "./bot/birthMessage";
import { viewMealStoreSearch, viewMealStoreSearchResult } from "./bot/mealStore";
import { randomStoreSelect, openRandomStore } from "./bot/randomMealStore";
import { checkConversation } from "./bot/conversation";

export class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
        const message = MessageFactory.text('');
        message.type = ActivityTypes.Typing;
        await context.sendActivity(message);
  
        const user = userMap[context.activity.from.id];
        if(!user) {
          await context.sendActivity('유저 정보를 등록중입니다. 다시 한번 요청해 주세요.');
          await next();
          return;
        }
  
        if(context.activity.text) {
          let txt = context.activity.text;
          const removedMentionText = TurnContext.removeRecipientMention(context.activity);
          if (removedMentionText) {
            txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
          }
          const text = txt.split(" ");
          if (text[0] === '근무지등록') {
            await setWorkplaceForm(context, context.activity.from.id, text[1], 'work', null);   
          } else if (text[0] + text[1] === '근무지등록') {
            await setWorkplaceForm(context, context.activity.from.id, text[2], 'work', null);
          } else if (text[0] === '근무지') {
            await getWorkplace(context, text[1], text[2]);
          } else if (text[0] === '홈' || text[0].toLowerCase() === 'home' || text[0] === 'ㅎ') {
            await sendCommand(context);
          } else if (text[0] === '메시지' || text[0] === '메세지') {
            await viewSecretMessage(context, context.activity.from.id, text[1]);
          } else if (text[0] === '비플식권페이' || text[0] === '비식페' || text[0] === '식사' || text[0] === '점심') {
            await viewMealStoreSearch(context);
          } else if (text[0] === '식사랜덤') {
            await randomStoreSelect(context);
          } else if (text[0] === 'birthtest') {
            await sendBirthdayCard();
          } else if (text[0] === 'workplacetestsend') {
            await setWorkplaceForm(context, null, null, 'send', '좋은 아침입니다!');
          } else if (text[0] === 'workplacetestresend') {
            await setWorkplaceForm(context, null, null, 'resend', '테스트로 전송된 메세지입니다. workplacetestresend');
          } else {

            await checkConversation(context, txt);
         //   await sorryMessage();
          }
        } else if(context.activity.value) {
          if (context.activity.value.messageType === "getWorkplaceForm") {
            await getWorkplaceForm(context);
          } else if (context.activity.value.messageType === "getWorkplace") {  
            await getWorkplace(context, context.activity.value.username, null);
          } else if (context.activity.value.messageType === "mealStoreSearch") {  
            await viewMealStoreSearch(context);
          } else if (context.activity.value.messageType === "mealStoreSearchResult" || context.activity.value.messageType === "mealStoreSearchResultMore") {  
            await viewMealStoreSearchResult(context);
          } else if (context.activity.value.messageType === "randomStoreSelect") {  
            await randomStoreSelect(context);
          } else if (context.activity.value.messageType === "openRandomStore") {  
            await openRandomStore(context);
          } else if (context.activity.value.messageType === "setWorkplace") {  
            await setWorkplace(context, context.activity.from.id, context.activity.value.UPN, context.activity.value.WorkDate, context.activity.value.WorkCodeAM, context.activity.value.WorkCodePM);
          } else if (context.activity.value.messageType === "setWorkplaceForm") {
            await setWorkplaceForm(context, context.activity.from.id, null, 'work', null);
          } else if (context.activity.value.messageType === "viewSecretMessage") {
            await viewSecretMessage(context, context.activity.from.id, null);
          } else if (context.activity.value.messageType === "sendSecretMessage") {  
            await sendSecretMessage(context, context.activity.from.id, context.activity.value.receiver, context.activity.value.senderNick, context.activity.value.message, context.activity.value.background);
          } else if (context.activity.value.messageType === "openSecretMessage") {  
            await openSecretMessage(context, context.activity.from.id, context.activity.value.messageId);
          } else if (context.activity.value.messageType === "openBirthMessage") {  
            await openBirthMessage(context, context.activity.value.messageId, context.activity.value.username, context.activity.value.birthDate);
          } else if (context.activity.value.messageType === "viewCommandList") {  
            await viewCommandList(context);
          } else {
            await sorryMessage(context);
          }
        } else {
          await sorryMessage(context);
        }
  
        await next();
    });

    this.onReactionsAdded(async (context, next) => {
      await sendMessageReaction(context, context.activity.from.id, context.activity.id, context.activity.reactionsAdded[0].type);      
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await context.sendActivity(`반갑습니다. 콜슨 앱이 설치되었습니다.`);
          
          const card = AdaptiveCards.declare(sendCommandTemplate).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
      }
      await next();
    });
  }
}