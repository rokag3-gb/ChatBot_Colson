import { TurnContext } from "botbuilder";
import { errorMessageForContext } from "./common"
import mealStoreSearch from "./adaptiveCards/mealStoreSearch.json";
import mealStoreSearchResult from "./adaptiveCards/mealStoreSearchResult.json";
import { sql } from "./mssql"
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";

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


    tmpTemplate.body[4].choices.push({
      "title": '중식',
      "value": '중식'
    });
    tmpTemplate.body[4].choices.push({
      "title": '양식',
      "value": '양식'
    });



    const card = AdaptiveCards.declare(tmpTemplate).render();
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  
  } catch (e) {
    console.log(e);
  }
}

export const viewMealStoreSearchResult = async (context: TurnContext) => {
  try {
    const storeName = context.activity.value.storeName;
    const storeCategory = context.activity.value.storeCategory;

    await context.sendActivity(`'${storeName}'을 포함한 지정가맹점을 조회합니다.`);

    const category = await getMealStore(storeName, storeCategory);
    if(category.length === 0) {
      await context.sendActivity(`'${storeName}'을 포함한 지정가맹점이 없습니다.`);
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
      storeName: storeName
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  
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