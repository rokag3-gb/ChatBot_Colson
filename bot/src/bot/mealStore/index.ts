import { TurnContext } from "botbuilder";
import mealStoreSearch from "../../adaptiveCards/mealStoreSearch.json";
import mealStoreSearchResult from "../../adaptiveCards/mealStoreSearchResult.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";
import ACData = require("adaptivecards-templating");
import { UspGetMealStoreCategory, UspGetMealStore } from "./query";
import imageToBase64 from "image-to-base64";
import { imgPath } from "../common"

export const viewMealStoreSearch = async (context: TurnContext) => {
  const category = await UspGetMealStoreCategory();

  await context.sendActivity(`비플 가맹점 조회를 선택하셨습니다.`);

  const tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearch));
  let first = true;
  tmpTemplate.body[4].value = "";
  
  for(const row of category) {
    tmpTemplate.body[4].choices.push({
      "title": row.Category,
      "value": row.Category
    });

    if(first) {
      first = false;
    } else {
      tmpTemplate.body[4].value += ",";
    }
    tmpTemplate.body[4].value += row.Category;
  }

  const card = AdaptiveCards.declare(tmpTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const updateMealStoreSearch = async (context: TurnContext, storeName: string, storeCategory: string) => {
  const category = await UspGetMealStoreCategory();

  const tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearch));
  
  for(const row of category) {
    tmpTemplate.body[4].choices.push({
      "title": row.Category,
      "value": row.Category
    });
  }

  tmpTemplate.body[2].value = storeName;
  tmpTemplate.body[4].value = storeCategory;
  
  const cardTemplate = new ACData.Template(tmpTemplate);
  const cardWithData = cardTemplate.expand({ $root: {} });
  const card = CardFactory.adaptiveCard(cardWithData);

  await context.updateActivity({
    type: "message",
    id: context.activity.replyToId,
    attachments: [card],
  });
}

export const viewMealStoreSearchResult = async (context: TurnContext) => {
  const storeName = context.activity.value.storeName;
  const storeCategory = context.activity.value.storeCategory;
  if(!storeName && !storeCategory) {
    await context.sendActivity(`한가지 이상의 검색 조건을 입력해 주세요.`);
    return;
  }

  await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}지정가맹점을 조회합니다.`);

  const rows = await UspGetMealStore(storeName, storeCategory);
  if(rows.length === 0) {
    await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}지정가맹점이 없습니다.`);
    await updateMealStoreSearch(context, storeName, storeCategory);
    return;
  }
  const linkIcon = await imageToBase64(imgPath + 'external_link_icon.png');

  const tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));
  for(const row of rows) {
    tmpTemplate.body[2].columns[0].items.push(<any>{
      "type": "Container",
      "bleed": true,
      "items": [
        {
          "type": "TextBlock",
          "wrap": true,
          "text": row.StoreName,
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
          "wrap": true,
          "text": row.Address,
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
          "wrap": true,
          "text": row.Category,
          "horizontalAlignment": "center",
          "size": "small"
        }
      ]
    });

    tmpTemplate.body[2].columns[3].items.push(<any>{
      "type": "Container",
      "style": "warning",
      "spacing": "none",
      "items": [
        {
          "type": "Image",
          "horizontalAlignment": "center",
          "url": "data:image/png;base64," + linkIcon
        }
      ],
      "selectAction": {
        "type": "Action.OpenUrl",
        "url": row.URL
      }
    });
  }
  const card = AdaptiveCards.declare(tmpTemplate).render({
    storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''} 가맹점을 조회하였습니다.`
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  await updateMealStoreSearch(context, storeName, storeCategory);
}