import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import workplaceMessage from "../../adaptiveCards/workplaceMessage.json";
import workplaceUserListTemplate from "../../adaptiveCards/workplaceUserList.json";
import { CardFactory, TurnContext } from "botbuilder";
import ACData = require("adaptivecards-templating");
import { UspGetUsers, UspGetWorkplace, } from "./query";
import { userMap } from "../common";

export const getWorkplaceForm = async (context: TurnContext) => {
  await context.sendActivity(`근무지 조회를 선택하셨습니다.`);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceUserListTemplate));

  const users = await UspGetUsers();
  for(const user of users) {
    tmpTemplate.body[1].choices.push({
      "title": user.DisplayName,
      "value": user.DisplayName
    });    
  }

  const user = userMap[context.activity.from.id];
  if(user && user.FullNameKR) {
    tmpTemplate.body[1].value = user.FullNameKR
  }
  
  const card = AdaptiveCards.declare(tmpTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const updateGetWorkplaceForm = async (context: TurnContext, value) => {
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceUserListTemplate));

  const users = await UspGetUsers();
  for(const user of users) {
    tmpTemplate.body[1].choices.push({
      "title": user.DisplayName,
      "value": user.DisplayName
    });    
  }

  tmpTemplate.body[1].value = value;

  const cardTemplate = new ACData.Template(tmpTemplate);
  const cardWithData = cardTemplate.expand({ $root: {} });
  const card = CardFactory.adaptiveCard(cardWithData);

  await context.updateActivity({
    type: "message",
    id: context.activity.replyToId,
    attachments: [card],
  });
}

export const getWorkplace = async (context: TurnContext, name, date) => {
  if(!name) {
    await context.sendActivity(`조회하실 분의 이름을 선택하고 다시 조회해주세요.`);
    return;
  }
  await context.sendActivity(`'${name}' 님을 선택하셨습니다.`);
  if(!date) {
    date = 7;
  }

  if(context.activity.replyToId)
    await updateGetWorkplaceForm(context, name);

  const tmpTemplate = JSON.parse(JSON.stringify(workplaceMessage));

  const tmp = date * 1;
  if(tmp > 30) {
    date = 30;
  }

  const rows = await UspGetWorkplace(name, date);
  if(rows.length === 0) {
    await context.sendActivity(`대상자 이름으로 사용자를 찾을 수 없습니다.`);
    return;
  }
  for(const row of rows) {
    tmpTemplate.body[2].columns[0].items.push(<any>{
      "type": "Container",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "wrap": true,
          "text": row.Date,
          "horizontalAlignment": "center",
          "size": "small"
        }
      ]
    });
    
    tmpTemplate.body[2].columns[1].items.push(<any>{
      "type": "Container",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "horizontalAlignment": "center",
          "wrap": true,
          "text": row.WeekName,
          "size": "small"
        }
      ]
    });
    
    tmpTemplate.body[2].columns[2].items.push(<any>{
      "type": "Container",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "horizontalAlignment": "center",
          "wrap": true,
          "text": row.WorkAM?row.WorkAM:".",
          "size": "small"
        }
      ]
    });
    
    tmpTemplate.body[2].columns[3].items.push(<any>{
      "type": "Container",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "horizontalAlignment": "center",
          "wrap": true,
          "text": row.WorkPM?row.WorkPM:".",
          "size": "small"
        }
      ]
    });
  }

  const card = AdaptiveCards.declare(tmpTemplate).render({
    name: name
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}
      