import { bot } from "../../internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "../../adaptiveCards/sendCommand.json";
import { CardFactory } from "botbuilder";
import { sql } from "../../mssql"
import { Member } from "@microsoft/teamsfx"
import { UspSetAppUser, UspGetUsers, UspSetAppLog } from "./query"

export const userMap = new Object();
export let userCount = 0;

export const imgPath = process.env.EXECUTE_ENV==="PROD"?"../../image/":"./image/";
export let parent = null;

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

export const sendCommand = async (context) => {
  const card = AdaptiveCards.declare(sendCommandTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

export const userRegister = async (userId) => {
  if(userCount === 0) {
    Object.keys(userMap).forEach(key => {
      delete userMap[key];
    });
  }

  const installations = await bot.notification.installations();
  let first = true;
  for (const target of installations) {
    try {
      const members = await target.members();
      for(const member of members) {
        if(member.account.id.indexOf(userId) >= 0 || userId === null) {
          try {
            if(first) {
              first = false;
              userCount = members.length;
              parent = member.parent;
            }

            await UspSetAppUser(member.account.id, member.account.userPrincipalName, JSON.stringify(member));
            userMap[member.account.id] = member;
          } catch (e) {
            console.log('userRegister ERROR!! ' + e);
          }
        }
      }
    } catch (e) {
      console.log('userRegister ERROR2!! ' + e);
    }
  }
  console.log('userRegister complete');
}

export const getUserList = async (userId) => {
  const rows = await UspGetUsers();
  for(const row of rows) {
    if(row.AppUserId !== null && (userId === row.AppUserId || userId === null)) {
      const user = userMap[row.AppUserId];
      if(user) {
        userMap[row.AppUserId].FullNameKR = row.DisplayName;
        userMap[row.AppUserId].LastNameKR = row.LastNameKR;
        userMap[row.AppUserId].FirstNameKR = row.FirstNameKR;
      } else if (row.AppUserObject) {
        const userObj = <Member>JSON.parse(row.AppUserObject);
        const member = <any>new Member(parent, userObj.account);
        member.FullNameKR = row.DisplayName;
        member.LastNameKR = row.LastNameKR;
        member.FirstNameKR = row.FirstNameKR;
        userMap[row.AppUserId] = member;
      }
    }
  }
  console.log('getUserList complete');
}

export const insertLog = async (userId, body) => {
  const request = new sql.Request();
  request.stream = true;

  let userPrincipalName = '';
  const user = userMap[userId]

  if(user) {
    userPrincipalName = user.account.userPrincipalName;
  }

  await UspSetAppLog(getTodayTime(), userPrincipalName, body);
}

export const errorMessageForContext = async (context, err) => {
  return new Promise(async (resolve, reject) => {
    try {
      await context.sendActivity(`에러가 발생했습니다. 다시 시도해주세요.

ㅤ
 
(${err.message})`);
      resolve(true);
    } catch (e) {
      console.log('errorMessageForContext ' + e);
      reject(e);
    }
  });
}

export const errorMessageForId = async (id, err) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = userMap[id];
      if(user && id) {
        user.sendMessage(`에러가 발생했습니다. 다시 시도해주세요.

ㅤ

(${err.message})`);
      }
      resolve(true);
    } catch (e) {
      console.log('errorMessageForId ' + e);
      reject(e);
    }
  });
}

export const sorryMessage = async (context) => {
  await context.sendActivity( `처리할 수 없는 메시지입니다. 다시 시도해주세요.`);
}

export const viewCommandList = async(context) => {
  await context.sendActivity( `홈, home, ㅎ => 홈 페이지 표시
  
  근무지 홍길동 => 홍길동 사원의 14일간의 근무지를 조회
  
  근무지 홍길동 10 => 홍길동 사원의 10일간의 근무지를 조회
  
  근무지 등록 => 근무지 등록 페이지를 표시
  
  메시지 홍길동 => 홍길동 사원에게 비밀 메세지를 보냅니다.`);
}
      
export const query = async (request: any, query: string): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = [];
      request.query(query, (err, result) => {
        if(err){
          reject(err);
        }
      });
    
      request.on('error', async (err) => {
        reject(err);
      }).on('row', (row) => {
        result.push(row);
      }).on('done', async () => {
        resolve(result);
      });
    } catch(e) {
      reject(e);
    }
  });
}