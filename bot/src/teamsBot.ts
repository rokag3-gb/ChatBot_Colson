import { default as axios } from "axios";
import * as querystring from "querystring";
import {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  AdaptiveCardInvokeValue,
  AdaptiveCardInvokeResponse,
  BotHandler,
} from "botbuilder";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";

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

export interface DataInterface {
  likeCount: number;
}

export class TeamsBot extends TeamsActivityHandler {
  // record the likeCount
  likeCountObj: { likeCount: number };

  constructor() {
    super();

    this.likeCountObj = { likeCount: 0 };

    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");

      let txt = context.activity.text;
      const removedMentionText = TurnContext.removeRecipientMention(context.activity);
      if (removedMentionText) {
        // Remove the line break
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

  // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
  // method handles that event.
  async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    
    console.log('invokeValue ' + JSON.stringify(invokeValue));
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
    } else {
      sorryMessage(context.activity.from.id);
    }
    return { statusCode: 200, type: undefined, value: undefined };
  }

  // Message extension Code
  // Action.
  public async handleTeamsMessagingExtensionSubmitAction(
    context: TurnContext,
    action: any
  ): Promise<any> {
    switch (action.commandId) {
      case "createCard":
        return createCardCommand(context, action);
      case "shareMessage":
        return shareMessageCommand(context, action);
      default:
        throw new Error("NotImplemented");
    }
  }

  // Search.
  public async handleTeamsMessagingExtensionQuery(context: TurnContext, query: any): Promise<any> {
    const searchQuery = query.parameters[0].value;
    const response = await axios.get(
      `http://registry.npmjs.com/-/v1/search?${querystring.stringify({
        text: searchQuery,
        size: 8,
      })}`
    );

    const attachments = [];
    response.data.objects.forEach((obj) => {
      const heroCard = CardFactory.heroCard(obj.package.name);
      const preview = CardFactory.heroCard(obj.package.name);
      preview.content.tap = {
        type: "invoke",
        value: { name: obj.package.name, description: obj.package.description },
      };
      const attachment = { ...heroCard, preview };
      attachments.push(attachment);
    });

    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: attachments,
      },
    };
  }

  public async handleTeamsMessagingExtensionSelectItem(
    context: TurnContext,
    obj: any
  ): Promise<any> {
    return {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [CardFactory.heroCard(obj.name, obj.description)],
      },
    };
  }

  // Link Unfurling.
  public async handleTeamsAppBasedLinkQuery(context: TurnContext, query: any): Promise<any> {
    const attachment = CardFactory.thumbnailCard("Image Preview Card", query.url, [query.url]);

    const result = {
      attachmentLayout: "list",
      type: "result",
      attachments: [attachment],
    };

    const response = {
      composeExtension: result,
    };
    return response;
  }
}

async function createCardCommand(context: TurnContext, action: any): Promise<any> {
  // The user has chosen to create a card by choosing the 'Create Card' context menu command.
  const data = action.data;
  const heroCard = CardFactory.heroCard(data.title, data.text);
  heroCard.content.subtitle = data.subTitle;
  const attachment = {
    contentType: heroCard.contentType,
    content: heroCard.content,
    preview: heroCard,
  };

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [attachment],
    },
  };
}

async function shareMessageCommand(context: TurnContext, action: any): Promise<any> {
  // The user has chosen to share a message by choosing the 'Share Message' context menu command.
  let userName = "unknown";
  if (
    action.messagePayload &&
    action.messagePayload.from &&
    action.messagePayload.from.user &&
    action.messagePayload.from.user.displayName
  ) {
    userName = action.messagePayload.from.user.displayName;
  }

  // This Message Extension example allows the user to check a box to include an image with the
  // shared message.  This demonstrates sending custom parameters along with the message payload.
  let images = [];
  const includeImage = action.data.includeImage;
  if (includeImage === "true") {
    images = [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtB3AwMUeNoq4gUBGe6Ocj8kyh3bXa9ZbV7u1fVKQoyKFHdkqU",
    ];
  }
  const heroCard = CardFactory.heroCard(
    `${userName} originally sent this message:`,
    action.messagePayload.body.content,
    images
  );

  if (
    action.messagePayload &&
    action.messagePayload.attachment &&
    action.messagePayload.attachments.length > 0
  ) {
    // This sample does not add the MessagePayload Attachments.  This is left as an
    // exercise for the user.
    heroCard.content.subtitle = `(${action.messagePayload.attachments.length} Attachments not included)`;
  }

  const attachment = {
    contentType: heroCard.contentType,
    content: heroCard.content,
    preview: heroCard,
  };

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [attachment],
    },
  };
}
