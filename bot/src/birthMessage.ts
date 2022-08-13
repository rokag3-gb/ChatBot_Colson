import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { BirthCardData, BirthOpenData } from "./model/cardModels";
import { CardFactory } from "botbuilder";
import openBirthMessageTemplate from "./adaptiveCards/openBirthMessage.json";
import sendBirthMessageTemplate from "./adaptiveCards/sendBirthMessage.json";

import { sql } from "./mssql"
import { userMap, imgPath, errorMessageForId } from "./common";
import imageToBase64 from "image-to-base64";

export const sendBirthdayCard = async (context) => {
  const userList = <[]>await getBirthdayUser(context);
  if(userList.length === 0) {
    return;
  }

  for(const userInfo of <any[]>userList) {
    const userObject = userMap[userInfo.AppUserId];
    if(!userObject) {
      continue;
    }    
    const msgId = await <any>setSendBirth(context, userInfo.UPN, userInfo.BirthDate);
    const card = AdaptiveCards.declare(openBirthMessageTemplate).render({
      messageId: msgId,
      birthDate: userInfo.BirthDate,
      username: userInfo.DisplayName
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  }
}

const getBirthdayLink = (context) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      const query = `[IAM].[bot].[Usp_Get_Birth_Link]`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      const list = [];
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', (row) => {    
        list.push(row);
      }).on('done', () => { 
        resolve(list);
      });
    } catch(e) {
      await errorMessageForId(context, e);
      reject(e);
    }
  });
}

const getBirthdayUser = (context) => {
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
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
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

const setSendBirth = (context, receiver, birthDate) => {
  return new Promise(async (resolve, reject) => {
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
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', (row) => {
        resolve(row.birthId);
      });
    } catch(e) {
      await errorMessageForId(context, e);
      reject(e);
    }
  });
}

export const openBirthMessage = async (context, messageId, username, birthDate) => {
  const d = new Date(birthDate);
  const birthDateKr = ("00" + (d.getMonth() + 1)).slice(-2) + "월 " + ("00" + d.getDate()).slice(-2) + "일"

  const link = <[any]>await getBirthdayLink(context);
  const tmpTemplate = JSON.parse(JSON.stringify(sendBirthMessageTemplate));

  for(const row of link) {
    tmpTemplate.actions.push({
      type: "Action.OpenUrl",
      title: row.LinkName,
      url: row.Link,
    });
  }

  let background = await imageToBase64(imgPath + "birth_background.jpg");
  await setOpenBirth(context, messageId);  

  const card = AdaptiveCards.declare(tmpTemplate).render({
    background: background,
    title: `${birthDateKr}은 ${username} 님의 생일입니다.`,
    bodyTop: `${username} 님 생일 축하해요!`,
    bodyBottom: `소중하고 행복한 하루 보내세요 :)`
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const setOpenBirth = (context, birthId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('birthId', sql.BigInt, birthId);
    
      request.query(`[IAM].[bot].[Usp_Set_Open_Birth] @birthId`
        , (err) => {
          if(err){
            reject(err);
          }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      await errorMessageForId(context, e);
      reject(e);
    }
  });
}