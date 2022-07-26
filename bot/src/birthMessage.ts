import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { BirthCardData } from "./model/cardModels";
import openBirthMessageTemplate from "./adaptiveCards/openBirthMessage.json";
import sendBirthMessageTemplate from "./adaptiveCards/sendBirthMessage.json";

import { sql } from "./mssql"
import { userMap,
         allUserList } from "./common";

export const sendBirthdayCard = async () => {
  const userList = <[]>await getBirthdayUser();
  if(userList.length === 0) {
    return;
  }

  for(const u of userList) {
    const user = userMap[(<any>u).AppUserId];
    const userInfo = allUserList[(<any>u).UPN];
    if(user === undefined || user === null || userInfo === undefined || userInfo === null) {
      continue;
    }    
    openBirthMessageTemplate.actions[0].data.messageId = <number>await setSendBirth(userInfo.UPN, userInfo.BirthDate);
    openBirthMessageTemplate.actions[0].data.birthDate = userInfo.BirthDate
    openBirthMessageTemplate.actions[0].data.username = userInfo.Name;

    user.sendAdaptiveCard(
      AdaptiveCards.declare(openBirthMessageTemplate).render()
    );
  }
}

const getBirthdayLink = () => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      const query = `[IAM].[bot].[Usp_Get_Birth_Link]`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      const list = [];
      request.on('row', (row) => {    
        list.push(row);
      }).on('done', () => { 
        resolve(list);
      });
    } catch(e) {
      reject(e);
    }
  });
}

const getBirthdayUser = () => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('appId', sql.VarChar, process.env.BOT_ID);
      const query = `[IAM].[bot].[Usp_Get_Users_Birthday_Upcoming] @appId`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      const list = [];
      request.on('row', (row) => {    
        list.push(row);
      }).on('done', () => { 
        resolve(list);
      });
    } catch(e) {
      reject(e);
    }
  });
}

const setSendBirth = (receiver, birthDate) => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('appId', sql.VarChar, process.env.BOT_ID);
      request.input('receiver', sql.VarChar, receiver);
      request.input('birthDate', sql.VarChar, birthDate);
    
      request.query(`[IAM].[bot].[Usp_Set_Send_Birth] @appId, @receiver, @birthDate`
        , (err) => {
          if(err){
            reject(err);
          }
      });
    
      request.on('row', (row) => {
        resolve(row.birthId);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export const openBirthMessage = async (body) => {
  const d = new Date(body.value.birthDate);
  const birthDate = ("00" + (d.getMonth() + 1)).slice(-2) + "월 " + ("00" + d.getDate()).slice(-2) + "일"
  const user = userMap[body.from.id];

  const link = <[any]>await getBirthdayLink();

  for(const row of link) {
    sendBirthMessageTemplate.actions.push({
      type: "Action.OpenUrl",
      title: row.LinkName,
      url: row.Link,
    });
  }

  await setOpenBirth(body.value.messageId);
  
  user.sendAdaptiveCard(
    AdaptiveCards.declare<BirthCardData>(sendBirthMessageTemplate).render({
      title: `${birthDate}은 ${body.value.username} 님의 생일입니다.`,
      body: `생일축하해요~~~`
    })
  );
}

const setOpenBirth = (birthId) => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('birthId', sql.BigInt, birthId);
    
      request.query(`[IAM].[bot].[Usp_Set_Open_Birth] @birthId`
        , (err) => {
          if(err){
            reject(err);
          }
      });
    
      request.on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}