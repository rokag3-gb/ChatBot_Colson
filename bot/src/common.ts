import { bot } from "./internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import { sql } from "./mssql"

export const userMap = new Object();

export const imgPath = process.env.EXECUTE_ENV==="PROD"?"../../image/":"./image/";

export const getToday = (day) => {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
  const koreaTimeDiff = 9 * 60 * 60 * 1000; 
  const date = new Date(utcNow + koreaTimeDiff);

  if(day) {
    date.setDate(date.getDate() + day);
  }
  return date.getFullYear() + "-" + ("00" + (1 + date.getMonth())).slice(-2) + "-" + ("00" + date.getDate()).slice(-2);
}

export const getTodayTime = () => {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
  const koreaTimeDiff = 9 * 60 * 60 * 1000; 
  const d = new Date(utcNow + koreaTimeDiff);
  
  return d.getFullYear() + "-" + ("00" + (d.getMonth() + 1)).slice(-2) + "-" + ("00" + d.getDate()).slice(-2) + " " + 
        ("00" + d.getHours()).slice(-2) + ":" + ("00" + d.getMinutes()).slice(-2) + ":" + ("00" + d.getSeconds()).slice(-2);
}

export const checkWeekday = (day) => {
  const week = new Date(day).getDay();
  if(week === 0 || week === 6) {
    return true;
  }
  return false;
}

export const sendMessage = async (userID, body) => {
  const user = userMap[userID];
  if(user)
    await user.sendMessage(body);
}

export const sendCommand = async (userID) => {
  const user = userMap[userID];
  await user.sendAdaptiveCard(
    AdaptiveCards.declare(sendCommandTemplate).render()
  );
}

export const userRegister = async (userId) => {
  const installations = await bot.notification.installations();
  for (const target of installations) {
    const members = await target.members();
    for(const member of members) {
      if(member.account.id.indexOf(userId) >= 0 || userId === null) {
        const request = new sql.Request();
        request.stream = true;
        request.input('appId', sql.VarChar, process.env.BOT_ID);
        request.input('userId', sql.VarChar, member.account.id);
        request.input('upn', sql.VarChar, member.account.userPrincipalName);

        request.query(`[IAM].[bot].[Usp_Set_App_User] @appId, @upn, @userId`
          , (err) => {
            if(err){
                return console.log('query error :',err)
            }
        });        

        request.on('error', (err) => {
          console.log('Database Error : ' + err);
        });
        
        userMap[member.account.id] = member;
      }
    }
  }
  console.log('userRegister complete');
}

export const getUserList = async (userId) => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      request.input('appId', sql.VarChar, process.env.BOT_ID);
    
      request.query(`EXEC [IAM].[bot].[Usp_Get_Users] @appId`, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('error', (err) => {
        console.log('Database Error : ' + err);
      }).on('row', (row) => {
        if(row.AppUserId !== null && (userId === row.AppUserId || userId === null)) {
          const user = userMap[row.AppUserId];
          if(user) {
            userMap[row.AppUserId].account.name = row.DisplayName;
          }
        }
      }).on('done', async () => {
        console.log('getUserList complete');
        resolve(true);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export const insertLog = async (userId, body) => {
  const request = new sql.Request();
  request.stream = true;

  let userPrincipalName = '';
  const user = userMap[userId]

  if(user) {
    userPrincipalName = user.account.userPrincipalName;
  }

  request.input("ts", sql.VarChar, getTodayTime()) ;
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('upn', sql.VarChar, userPrincipalName);
  request.input('body', sql.VarChar, body);

  request.query(`[IAM].[bot].[Usp_Set_App_Log] @ts, @appId, @upn, @body`
  , (err) => {
    if(err) {
        return console.log('query error :',err)
    }
  });

  request.on('error', (err) => {
    console.log('Database Error : ' + err);
  });
}

export const sorryMessage = async (id) => {
  await sendMessage(id,  `죄송합니다.

처리할 수 없는 메시지입니다.`);
}

export const viewCommandList = async(id) => {
  await sendMessage(id,  `홈, home, ㅎ => 홈 페이지 표시
  
  근무지 홍길동 => 홍길동 사원의 14일간의 근무지를 조회
  
  근무지 홍길동 10 => 홍길동 사원의 10일간의 근무지를 조회
  
  근무지 등록 => 근무지 등록 페이지를 표시
  
  메시지 홍길동 => 홍길동 사원에게 비밀 메세지를 보냅니다.`);
}