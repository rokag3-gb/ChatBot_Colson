import { TurnContext } from "botbuilder";
import { errorMessageForContext } from "./common"
import mealStoreSearch from "./adaptiveCards/mealStoreSearch.json";
import mealStoreSearchResult from "./adaptiveCards/mealStoreSearchResult.json";
import { sql } from "./mssql"
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";
import ACData = require("adaptivecards-templating");

export const viewMealStoreSearch = async (context: TurnContext) => {
  try {
    const category = await getCategoryList();

    await context.sendActivity(`비플 가맹점 조회를 선택하셨습니다.`);

    const tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearch));
    
    for(const row of category) {
      tmpTemplate.body[4].choices.push({
        "title": row.Category,
        "value": row.Category
      });
    }

    const card = AdaptiveCards.declare(tmpTemplate).render();
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  
  } catch (e) {
    console.log(e);
  }
}

const updateMealStoreSearch = async (context: TurnContext, storeName: string, storeCategory: string) => {
  try {
    const category = await getCategoryList();

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
  
  } catch (e) {
    console.log(e);
  }
}

export const viewMealStoreSearchResult = async (context: TurnContext) => {
  try {
    const storeName = context.activity.value.storeName;
    const storeCategory = context.activity.value.storeCategory;
    if(!storeName && !storeCategory) {
      await context.sendActivity(`한가지 이상의 검색 조건을 입력해 주세요.`);
      return;
    }

    await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}지정가맹점을 조회합니다.`);

    const category = await getMealStore(storeName, storeCategory);
    if(category.length === 0) {
      await context.sendActivity(`${storeName?"'"+storeName+"'을 포함한 ":''}지정가맹점이 없습니다.`);
      await updateMealStoreSearch(context, storeName, storeCategory);
      return;
    }

    const tmpTemplate = JSON.parse(JSON.stringify(mealStoreSearchResult));
    for(const row of category) {
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
        ],
        "selectAction": {
          "type": "Action.OpenUrl",
          "url": row.URL
        }
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
        ],
        "selectAction": {
          "type": "Action.OpenUrl",
          "url": row.URL
        }
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
        ],
        "selectAction": {
          "type": "Action.OpenUrl",
          "url": row.URL
        }
      });
    }
    const card = AdaptiveCards.declare(tmpTemplate).render({
      storeNameText: `${storeName?"'"+storeName+"'을 포함한 ":''} 지점가맹점을 조회하였습니다.`
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    await updateMealStoreSearch(context, storeName, storeCategory);
  } catch (e) {
    console.log(e);
  }
}

const getCategoryList = (): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = [];
      const request = new sql.Request();
      const query = `EXEC [IAM].[bot].[Usp_Get_Meal_Store_Category]`;
    
      request.query(query, async (err) => {
        if(err) {
          reject(err);
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', async (row) => {
        result.push(row);
      }).on('done', () => { 
        resolve(result);
      });
     } catch(e) {
       reject(e);
     }
  });
}

const getMealStore = (StoreName: string, CategoryCSV: string): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = [];
      const request = new sql.Request();
      request.input('StoreName', sql.VarChar, StoreName);
      request.input('CategoryCSV', sql.VarChar, CategoryCSV);
      const query = `EXEC [IAM].[bot].[Usp_Get_Meal_Store] @StoreName, @CategoryCSV`;
    
      request.query(query, async (err) => {
        if(err) {
          reject(err);
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', async (row) => {
        result.push(row);
      }).on('done', () => { 
        resolve(result);
      });
     } catch(e) {
       reject(e);
     }
  });
}