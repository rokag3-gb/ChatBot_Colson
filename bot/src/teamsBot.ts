import { TeamsActivityHandler,
  MessageFactory, 
  ActivityTypes,
  CardFactory,
  TurnContext,
} from "botbuilder";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { sendMessage, 
  viewCommandList,
  sendCommand, 
  userMap,
  sorryMessage } from "./common";
import { getWorkplaceForm,
  getWorkplace, 
  setWorkplaceForm,
  setWorkplace } from "./workplace";
import { viewSecretMessage,
sendSecretMessage,
openSecretMessage,
sendMessageReaction } from "./secretMessage";
import { sendBirthdayCard,
openBirthMessage } from "./birthMessage";

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
          await setWorkplaceForm(context.activity.from.id, text[1], 'work', null);
        } else if (text[0] + text[1] === '근무지등록') {
          await setWorkplaceForm(context.activity.from.id, text[2], 'work', null);
        } else if (text[0] === '근무지') {
          await getWorkplace(context.activity.from.id, text[1], text[2]);
        } else if (text[0] === '홈' || text[0].toLowerCase() === 'home' || text[0] === 'ㅎ') {
          await sendCommand(context.activity.from.id);
        } else if (text[0] === '메시지' || text[0] === '메세지') {
          await viewSecretMessage(context.activity.from.id, text[1]);
        } else if (text[0] === 'birthtest') {
          await sendBirthdayCard();
        } else if (text[0] === 'workplacetestsend') {
          await setWorkplaceForm(null, null, 'send', '테스트로 전송된 메세지입니다. workplacetestsend');
        } else if (text[0] === 'workplacetestresend') {
          await setWorkplaceForm(null, null, 'resend', '테스트로 전송된 메세지입니다. workplacetestresend');
        } else {
          await sorryMessage(context.activity.from.id);
        }
      } else if(context.activity.value) {
        if (context.activity.value.messageType === "getWorkplaceForm") {
          await getWorkplaceForm(context.activity.from.id);
        } else if (context.activity.value.messageType === "getWorkplace") {  
          await getWorkplace(context.activity.from.id, context.activity.value.username, null);
        } else if (context.activity.value.messageType === "setWorkplace") {  
          await setWorkplace(context.activity.from.id, context.activity.value.UPN, context.activity.value.WorkDate, context.activity.value.WorkCodeAM, context.activity.value.WorkCodePM);
        } else if (context.activity.value.messageType === "setWorkplaceForm") {
          await setWorkplaceForm(context.activity.from.id, null, 'work', null);
        } else if (context.activity.value.messageType === "viewSecretMessage") {
          await viewSecretMessage(context.activity.from.id, null);
        } else if (context.activity.value.messageType === "sendSecretMessage") {  
          await sendSecretMessage(context.activity.from.id, context.activity.value.receiver, context.activity.value.senderNick, context.activity.value.message, context.activity.value.background);
        } else if (context.activity.value.messageType === "openSecretMessage") {  
          await openSecretMessage(context.activity.from.id, context.activity.value.messageId, context);
        } else if (context.activity.value.messageType === "openBirthMessage") {  
          await openBirthMessage(context.activity.from.id, context.activity.value.messageId, context.activity.value.username, context.activity.value.birthDate);
        } else if (context.activity.value.messageType === "viewCommandList") {  
          await viewCommandList(context.activity.from.id);
        } else {
          await sorryMessage(context.activity.from.id);
        }
      } else {
        await sorryMessage(context.activity.from.id);
      }

      await next();
    });

    this.onReactionsAdded(async (context, next) => {
      await sendMessageReaction(context.activity.from.id, context.activity.id, context.activity.reactionsAdded[0].type);      
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          await sendMessage(membersAdded[cnt].id, `반갑습니다. 콜슨 앱이 설치되었습니다.`);
          const card = AdaptiveCards.declareWithoutData(sendCommandTemplate).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
      }
      await next();
    });
  }
}