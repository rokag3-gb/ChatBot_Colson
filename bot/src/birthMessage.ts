import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { BirthCardData, BirthOpenData } from "./model/cardModels";
import openBirthMessageTemplate from "./adaptiveCards/openBirthMessage.json";
import sendBirthMessageTemplate from "./adaptiveCards/sendBirthMessage.json";

import { sql } from "./mssql"
import { userMap } from "./common";

export const sendBirthdayCard = async () => {
  const userList = <[]>await getBirthdayUser();
  if(userList.length === 0) {
    return;
  }

  for(const userInfo of <any[]>userList) {
    const userObject = userMap[userInfo.AppUserId];
    if(!userObject) {
      continue;
    }    
    const msgId = await <any>setSendBirth(userInfo.UPN, userInfo.BirthDate);
    await userObject.sendAdaptiveCard(
      AdaptiveCards.declare<BirthOpenData>(openBirthMessageTemplate).render({
        messageId: msgId,
        birthDate: userInfo.BirthDate,
        username: userInfo.DisplayName
      })
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
      request.on('error', (err) => {
        console.log('Database Error : ' + err);
      }).on('row', (row) => {    
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
      const query = `EXEC [IAM].[bot].[Usp_Get_Users_Birthday_Upcoming] @appId`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      const list = [];
      request.on('error', (err) => {
        console.log('Database Error : ' + err);
      }).on('row', (row) => {    
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
    
      request.on('error', (err) => {
        console.log('Database Error : ' + err);
      }).on('row', (row) => {
        resolve(row.birthId);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export const openBirthMessage = async (id, messageId, username, birthDate) => {
  const d = new Date(birthDate);
  const birthDateKr = ("00" + (d.getMonth() + 1)).slice(-2) + "월 " + ("00" + d.getDate()).slice(-2) + "일"
  const user = userMap[id];

  const link = <[any]>await getBirthdayLink();
  const tmpTemplate = JSON.parse(JSON.stringify(sendBirthMessageTemplate));

  for(const row of link) {
    tmpTemplate.actions.push({
      type: "Action.OpenUrl",
      title: row.LinkName,
      url: row.Link,
    });
  }

  await setOpenBirth(messageId);
  
  await user.sendAdaptiveCard(
    AdaptiveCards.declare<BirthCardData>(tmpTemplate).render({
      title: `${birthDateKr}은 ${username} 님의 생일입니다.`,
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
    
      request.on('error', (err) => {
        console.log('Database Error : ' + err);
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}