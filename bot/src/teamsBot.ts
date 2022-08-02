import { TeamsActivityHandler,
  MessageFactory, 
  ActivityTypes,
  CardFactory,
  TurnContext,
  AdaptiveCardInvokeValue,
  AdaptiveCardInvokeResponse,
} from "botbuilder";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { sendMessage, 
  viewCommandList,
  sendCommand, 
  sorryMessage } from "./common";
import { getWorkplaceForm,
  getWorkplace, 
  setWorkplaceForm,
  setWorkplace } from "./workplace";
import { viewSecretMessage,
sendSecretMessage,
openSecretMessage, } from "./secretMessage";
import { sendBirthdayCard,
openBirthMessage } from "./birthMessage";

export class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      const message = MessageFactory.text('');
      message.type = ActivityTypes.Typing;
      await context.sendActivity(message);

      let txt = context.activity.text;
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      if (removedMentionText) {
        txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
      }

      const text = txt.split(" ");
      if (text[0] === '근무지등록') {
        setWorkplaceForm(context.activity.from.id, text[1], 'work');
      } else if (text[0] + text[1] === '근무지등록') {
        setWorkplaceForm(context.activity.from.id, text[2], 'work');
      } else if (text[0] === '근무지') {
        getWorkplace(context.activity.from.id, text[1], text[2]);
      } else if (text[0] === '홈' || text[0].toLowerCase() === 'home' || text[0] === 'ㅎ') {
        sendCommand(context.activity.from.id);
      } else if (text[0] === '메시지' || text[0] === '메세지') {
        viewSecretMessage(context.activity.from.id, text[1]);
      } else if (text[0] === 'birthTest') {
        sendBirthdayCard();
      } else if (text[0] === 'workplaceTestSend') {
        setWorkplaceForm(null, null, 'send');
      } else if (text[0] === 'workplaceTestResend') {
        setWorkplaceForm(null, null, 'resend');
      } else {
        sorryMessage(context.activity.from.id);
      }

      await next();
    });

    this.onReactionsAdded(async (context, next) => {
      console.log('receive id ' + context.activity.id);
      const card = AdaptiveCards.declareWithoutData(sendCommandTemplate).render();
      const test = await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
      console.log('send id ' + test.id);
      
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          sendMessage(membersAdded[cnt].id, `반갑습니다. 콜슨 앱이 설치되었습니다.`);
          const card = AdaptiveCards.declareWithoutData(sendCommandTemplate).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          break;
        }
      }
      await next();
    });
  }

  async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    
    console.log('invokeValue ' + JSON.stringify(invokeValue));

    const message = MessageFactory.text('');
    message.type = ActivityTypes.Typing;
    await context.sendActivity(message);

    if (invokeValue.action.verb === "getWorkplaceForm") {
      getWorkplaceForm(context.activity.from.id);
    } else if (invokeValue.action.verb === "getWorkplace") {  
      getWorkplace(context.activity.from.id, invokeValue.action.data.username, null);
    } else if (invokeValue.action.verb === "setWorkplace") {  
      setWorkplace(context.activity.from.id, invokeValue.action.data.UPN, invokeValue.action.data.WorkDate, invokeValue.action.data.WorkCodeAM, invokeValue.action.data.WorkCodePM);
    } else if (invokeValue.action.verb === "setWorkplaceForm") {
      setWorkplaceForm(context.activity.from.id, null, 'work');
    } else if (invokeValue.action.verb === "viewSecretMessage") {
      viewSecretMessage(context.activity.from.id, null);
    } else if (invokeValue.action.verb === "sendSecretMessage") {  
      sendSecretMessage(context.activity.from.id, invokeValue.action.data.receiver, invokeValue.action.data.senderNick, invokeValue.action.data.message);
    } else if (invokeValue.action.verb === "openSecretMessage") {  
      openSecretMessage(context.activity.from.id, invokeValue.action.data.messageId);
    } else if (invokeValue.action.verb === "openBirthMessage") {  
      openBirthMessage(context.activity.from.id, invokeValue.action.data.messageId, invokeValue.action.data.username, invokeValue.action.data.birthDate);
    } else if (invokeValue.action.verb === "viewCommandList") {  
      viewCommandList(context.activity.from.id);
    } else {
      sorryMessage(context.activity.from.id);
    }
    return { statusCode: 200, type: undefined, value: undefined };
  }
}