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

  await context.sendActivity(`비플식권페이 가맹점 조회를 선택하셨습니다.`);

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

  await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}가맹점을 조회합니다.`);
  let tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));

  const rows = await UspGetMealStore(storeName, storeCategory);
  if(rows.length === 0) {
    const card = AdaptiveCards.declare(tmpTemplate).render({
      storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''}가맹점이 없습니다.`
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    await updateMealStoreSearch(context, storeName, storeCategory);
    return;
  }

  let start = 0;
  let end = 0;
  for(const row of rows) {
    if(end % 20 === 0 && start !== end) {
      const card = AdaptiveCards.declare(tmpTemplate).render({
        storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''} 가맹점을 조회하였습니다. (${start+1}~${end})`
      });
      await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
      tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));
      start = end;
    }
    end++;
    tmpTemplate.body[2].items.push(<any>{
      "type": "ColumnSet",
      "bleed": true,
      "columns": [
        {
          "type": "Column",
          "width": 4,
          "separator": true,
          "bleed": true,
          "verticalContentAlignment": "center",
          "spacing": "none",
          "items": [
            {
              "type": "Container",
              "items": [
                {
                  "type": "TextBlock",
                  "wrap": true,
                  "text": row.StoreName,
                  "size": "small"
                }
              ]
            }
          ]
        },
        {
          "type": "Column",
          "separator": true,
          "width": 8,
          "bleed": true,
          "verticalContentAlignment": "center",
          "items": [
            {
              "type": "Container",
              "items": [
                {
                  "type": "TextBlock",
                  "wrap": true,
                  "text": row.Address,
                  "size": "small"
                }
              ]
            }
          ]
        },
        {
          "type": "Column",
          "separator": true,
          "width": 3,
          "bleed": true,
          "verticalContentAlignment": "center",
          "spacing": "none",
          "items": [
            {
              "type": "Container",
              "items": [
                {
                  "type": "TextBlock",
                  "wrap": true,
                  "text": row.Category,
                  "horizontalAlignment": "center",
                  "size": "small"
                }
              ]
            }
          ]
        },
        {
          "type": "Column",
          "separator": true,
          "width": 2,
          "bleed": true,
          "verticalContentAlignment": "center",
          "spacing": "none",
          "items": [
            {
              "type": "Container",
              "items": [
                {
                  "type": "TextBlock",
                  "wrap": true,
                  "text": "🔗",
                  "horizontalAlignment": "center"
                }
              ]
            }
          ],
          "selectAction": {
            "type": "Action.OpenUrl",
            "url": row.URL
          }
        }
      ]
    });
  }
  if(start !== end) {
    const card = AdaptiveCards.declare(tmpTemplate).render({
      storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''} 가맹점을 조회하였습니다. (${start+1}~${end})`
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  }

  await updateMealStoreSearch(context, storeName, storeCategory);
}