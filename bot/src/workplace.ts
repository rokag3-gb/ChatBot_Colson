import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { WorkplaceCardData } from "./model/cardModels";
import workplaceTemplate from "./adaptiveCards/insertWorkplace.json";
import workplaceMessage from "./adaptiveCards/workplaceMessage.json";
import workplaceUserListTemplate from "./adaptiveCards/workplaceUserList.json";
import { CardFactory } from "botbuilder";
import { sql } from "./mssql"
import { getToday,
         checkWeekday,
         userMap,
         errorMessageForId } from "./common";
    
export const setWorkplaceForm = async (context, userId, username, type, message) => {
  try {
    if(!userId && checkWeekday(new Date())) {
      return;
    }
    if(userId) {
      await context.sendActivity(`근무지 등록을 선택하셨습니다.`);
    }
  
    const choiceList = await getWorkCode(userId);
    if(type === 'work') {
      await userWorkplace(context, userId, username, choiceList, message);
    } else if(type === 'send') {
      await userWorkplaceSend(context, choiceList, message);
    } else if(type === 'resend') {
      await userWorkplaceResend(context, choiceList, message);
    }
  } catch(e) {

  }
}

export const getWorkplaceForm = async (context) => {
  return new Promise(async (resolve, reject) => {
    try {
      await context.sendActivity(`근무지 조회를 선택하셨습니다.`);
      const tmpTemplate = JSON.parse(JSON.stringify(workplaceUserListTemplate));
      const request = new sql.Request();
    
      request.input('appId', sql.VarChar, process.env.BOT_ID);
      request.query(`EXEC [IAM].[bot].[Usp_Get_Users] @appId`, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', (row) => {
        tmpTemplate.body[1].choices.push({
          "title": row.DisplayName,
          "value": row.DisplayName
        });    
      }).on('done', async () => {
        try {
          if(tmpTemplate.body[1].choices.length !== 0) {
            tmpTemplate.body[1].value = tmpTemplate.body[1].choices[0].value;
          }
          const card = AdaptiveCards.declare(tmpTemplate).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
}

const getWorkCode = (context) => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      const choiceList = [];
      request.query(`EXEC [IAM].[bot].[Usp_Get_Work_Code]`, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', (row) => {    
        choiceList.push({"title" : row.Name, "value" : row.Code});
      }).on('done', () => {
        resolve(choiceList);
      });
    } catch(e) {
      reject(e);
    }
  });
}

//특정 유저의 근무지 등록을 위한 함수
const userWorkplace = async (context, userId, username, choiceList, message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      const fromUser = userMap[userId];
      let user = null;
    
      if(username) {
        for (const u of Object.entries(userMap)) {
          if(u[1].FullNameKR === username) {
            user = u[1];
            break;
          }
        }
        if(!user) {
          await context.sendActivity(`'${username}' 님을 찾을 수 없습니다.`);
          return
        }
        await context.sendActivity( `'${username}' 님의 근무지를 등록합니다.`);
        request.input('UPN', sql.VarChar, user.account.userPrincipalName);
      } else {
        request.input('UPN', sql.VarChar, fromUser.account.userPrincipalName);
      }
    
      let query = `EXEC [IAM].[bot].[Usp_Get_Users_Workplace] @date, @UPN`;
      request.input('date', sql.VarChar, getToday(null));
      request.query(query, (err, result) => {
        if(err){
          return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', async (row) => {    
        try {
          await sendWorkplaceCard(context, userId, choiceList, row.WorkCodeAM, row.WorkCodePM, user, message);
        } catch(e) {
          reject(e);
        }
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

//전체 유저의 근무지 등록을 위한 함수
export const userWorkplaceSend = async (context, choiceList, message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('appId', sql.VarChar, process.env.BOT_ID);
      request.input('date', sql.VarChar, getToday(null));
      const query = `[IAM].[bot].[Usp_Get_Users_Workplace_All] @date, @appId`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', async (row) => {    
        try {
          await sendWorkplaceCard(context, row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null, message);
        } catch(e) {
          reject(e);
        }
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

//근무지 등록을 하지 않은 유저의 근무지 등록을 위한 함수
const userWorkplaceResend = async (context, choiceList, message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('appId', sql.VarChar, process.env.BOT_ID);
      request.input('date', sql.VarChar, getToday(null));
      const query = `[IAM].[bot].[Usp_Get_Users_Workplace_Resend] @date, @appId`;
    
      request.query(query, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', async (row) => {    
        try {
          await sendWorkplaceCard(context, row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null, message);
        } catch(e) {
          reject(e);
        }
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export const sendWorkplaceCard = async (context, userId, choiceList, WorkCodeAM, WorkCodePM, user, message) => {
  try {
    const fromUser = userMap[userId];
    const day1 = getToday(null);
    const tmpTemplate = JSON.parse(JSON.stringify(workplaceTemplate));
  
    if(!user) {
      tmpTemplate.body[3].value = fromUser.account.userPrincipalName;
      tmpTemplate.body[3].choices.push({
        "title": fromUser.FullNameKR,
        "value": fromUser.account.userPrincipalName
      });
    } else {
      tmpTemplate.body[3].value = user.account.userPrincipalName;
      tmpTemplate.body[3].choices.push({
        "title": user.FullNameKR,
        "value": user.account.userPrincipalName
      });
    }
  
    tmpTemplate.body[4].value = day1;
    tmpTemplate.body[5].choices = choiceList;
    tmpTemplate.body[5].value = WorkCodeAM;
    tmpTemplate.body[6].choices = choiceList;
    tmpTemplate.body[6].value = WorkCodePM;
  
    let title = '근무지 등록';
    let button = '등록';
    let bodyMessage = '';
    if(!message) {
      bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록합니다.`
    } else if(WorkCodeAM && WorkCodePM) {
      title = '근무지 확인';
      button = '수정';
      bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 오늘 근무지가 맞나요?`
    } else {
      bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록해주세요`
    }
  
    const card = AdaptiveCards.declare(tmpTemplate).render({
      title: title,
      subtitle: message,
      body: bodyMessage,
      button: button
    });
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  } catch(e) {
    await errorMessageForId(context, e);
  }
}

export const setWorkplace = async (context, id, upn, workDate, workCodeAM, workCodePM) => {
  return new Promise(async (resolve, reject) => {
    try {
      const request = new sql.Request();
      request.stream = true;
    
      const user = userMap[id];
      if(!user) {
        await context.sendActivity(`잘못된 정보가 전달되었습니다.`);
        return;
      }
    
      request.input("WorkDate", sql.VarChar, workDate) ;
      request.input('UPN', sql.VarChar, upn);
      request.input('WorkCodeAM', sql.VarChar, workCodeAM);
      request.input('WorkCodePM', sql.VarChar, workCodePM);
      request.input('SaverUPN', sql.VarChar, user.account.userPrincipalName);
    
      request.query(`[IAM].[bot].[Usp_Set_Workplace] @WorkDate, @UPN, @WorkCodeAM, @WorkCodePM, @SaverUPN`
        , (err) => {
          if(err){
              return console.log('query error :',err)
          }
      });
    
      request.on('error', async (err) => {
        try {
          console.log('Database Error : ' + err);
          await errorMessageForId(context, err);
        } catch (e) {
          reject(e);
          throw e;
        }
      }).on('row', async (row) => {    
        try {
          await context.sendActivity(`${user.FullNameKR}님의 ${workDate} 일자 근무지가 입력되었습니다. (${row.WorkNameAM}${workCodePM?'/'+row.WorkNamePM:''})`);
        } catch(e) {
          reject(e);
        }
      }).on('done', () => {
        resolve(true);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export const getWorkplace = async (context, name, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if(!name) {
        await context.sendActivity(`조회하실 분의 이름을 선택하고 다시 조회해주세요.`);
        return;
      }
      await context.sendActivity(`'${name}' 님을 선택하셨습니다.`);
      if(!date) {
        date = 7;
      }
      const tmpTemplate = JSON.parse(JSON.stringify(workplaceMessage));
    
      const tmp = date * 1;
      if(tmp > 30) {
        date = 30;
      }
    
      const request = new sql.Request();
      request.input('Username', sql.VarChar, name);
      request.input('date', sql.Int, date);
      request.query(`[IAM].[bot].[Usp_Get_Workplace] @Username, @date`, async (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
        if(result.rowsAffected[0] === 0){
          await context.sendActivity(`${name} 님의 정보를 찾을 수 없습니다.`);
          return;
        }
      });
    
      tmpTemplate.body[1].text = `${name} 님의 근무지를 조회하였습니다.`;
      request.on('error', async (err) => {
        console.log('Database Error : ' + err);
        await errorMessageForId(context, err);
      }).on('row', (row) => {
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
      })
      .on('done', async () => { 
        try {
          if(tmpTemplate.body[2].columns[1].items.length === 1) {
            return;
          }
          const card = AdaptiveCards.declare(tmpTemplate).render();
          await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
          resolve(true);
        } catch(e) {
          reject(e);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
}
      