import { TurnContext } from "botbuilder";
import mealStoreSearch from "../../adaptiveCards/mealStoreSearch.json";
import mealStoreSearchResult from "../../adaptiveCards/mealStoreSearchResult.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";
import ACData = require("adaptivecards-templating");
import { UspGetMealStoreCategory, UspGetMealStore } from "./query";

const PAGE_ROW_SIZE = 10;

const header = {
  "type": "ColumnSet",
  "bleed": true,
  "columns": [
    {
      "type": "Column",
      "width": 4,
      "separator": true,
      "bleed": true,
      "spacing": "none",
      "items": [
        {
          "type": "Container",
          "style": "accent",
          "bleed": true,
          "items": [
            {
              "type": "TextBlock",
              "weight": "bolder",
              "horizontalAlignment": "center",
              "text": "상호",
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
      "spacing": "none",
      "items": [
        {
          "type": "Container",
          "style": "accent",
          "bleed": true,
          "items": [
            {
              "type": "TextBlock",
              "weight": "bolder",
              "horizontalAlignment": "center",
              "text": "분류",
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
      "spacing": "none",
      "items": [
        {
          "type": "Container",
          "style": "accent",
          "bleed": true,
          "items": [
            {
              "type": "TextBlock",
              "weight": "bolder",
              "horizontalAlignment": "center",
              "text": "링크",
              "size": "small"
            }
          ]
        }
      ]
    }
  ]
};

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
  const pageNo = context.activity.value.pageNo;
  if(!storeName && !storeCategory) {
    await context.sendActivity(`한가지 이상의 검색 조건을 입력해 주세요.`);
    return;
  }

  if(context.activity.value.messageType === "mealStoreSearchResult")
    await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}가맹점을 조회합니다.`);
  let tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));

  const rows = await UspGetMealStore(storeName, storeCategory, pageNo);
  const result = rows[rows.length-1];
  if(result.DataRowCount === 0) {
    const card = AdaptiveCards.declare(tmpTemplate).render({
      storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''}가맹점이 없습니다.`
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    await updateMealStoreSearch(context, storeName, storeCategory);
    return;
  }
  
  const pageStart = (result.PageSize * (result.CurrentPageNo-1)) / PAGE_ROW_SIZE + 1;
  let count = 0;
  
  let bodyData = {
    "type": "Container",
    "id": `page${count}`,
    "isVisible": true,
    "items": [
      header
    ]
  };
  let actionData = {
    "type": "Action.ToggleVisibility",
    "title": `${count+pageStart}`,
    "targetElements": [
    ]
  };

  for(let i = 0; i < rows.length-1; i++) {
    const row = rows[i];
    if(i % PAGE_ROW_SIZE === 0 && i !== 0) {
      tmpTemplate.body.push(bodyData);
      tmpTemplate.actions.push(actionData);

      count++;

      bodyData = {
        "type": "Container",
        "id": `page${count}`,
        "isVisible": false,
        "items": [
          header
        ]
      };
      actionData = {
        "type": "Action.ToggleVisibility",
        "title": `${count+pageStart}`,
        "targetElements": [
        ]
      };
    }

    bodyData.items.push(<any>{
      "type": "ColumnSet",
      "bleed": true,
      "columns": [
        {
          "type": "Column",
          "width": 4,
          "separator": true,
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
          "width": 3,
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
  if(bodyData.items.length !== 0) {
    tmpTemplate.body.push(bodyData);
    tmpTemplate.actions.push(actionData);
  }

  for(let i = 0; i < count+1; i++) {
    for(let j = 0; j < count+1; j++) {
      tmpTemplate.actions[i].targetElements.push(
        {
          "elementId": `page${j}`,
          "isVisible": j===i?true:false
        }
      )
    }
  }
  
  if(result.TotalPageCount !== result.CurrentPageNo) {
    tmpTemplate.actions.push({
      "type": "Action.Submit",
      "title": "more",
      "data": {
        "storeName": storeName,
        "storeCategory": storeCategory,
        "messageType": "mealStoreSearchResultMore",
        "pageNo": pageNo + 1
      }
    });
  }

  tmpTemplate.actions.push({
    "type":"Action.OpenUrl",
    "title":"식당 등록 요청하기",
    "url":"https://forms.office.com/r/aBXTL8GbsZ"
  });
  

  const curCountStart = result.PageSize * (result.CurrentPageNo-1) + 1;
  const curCountEnd = result.CurrentPageNo===result.TotalPageCount?result.DataRowCount:result.PageSize * result.CurrentPageNo;
  
  const card = AdaptiveCards.declare(tmpTemplate).render({
    storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''} 가맹점을 조회하였습니다. (${curCountStart}~${curCountEnd})`
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));

  if(context.activity.value.messageType === "mealStoreSearchResult")
    await updateMealStoreSearch(context, storeName, storeCategory);
}