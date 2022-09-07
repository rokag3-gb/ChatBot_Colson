import { bot } from "../../internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "../../adaptiveCards/sendCommand.json";
import { CardFactory } from "botbuilder";
import { sql } from "../../mssql"
import { Member } from "@microsoft/teamsfx"
import { UspSetAppUser, UspGetUsers, UspSetAppLog } from "./query"
import { pushPeople } from "../conversation"
import { Logger } from "../../logger";

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
            Logger.error('userRegister ERROR!! ' + e);
            console.log('userRegister ERROR!! ' + e);
          }
        }
      }
    } catch (e) {
      Logger.error('userRegister ERROR!! ' + e);
      console.log('userRegister ERROR2!! ' + e);
    }
  }
  Logger.info('userRegister complete');
  console.log('userRegister complete');
}

export const getUserList = async (userId) => {
  const rows = await UspGetUsers();
  for(const row of rows) {
    pushPeople(row.DisplayName);
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
  Logger.info('getUserList complete');
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
      Logger.error('errorMessageForContext ' + e);
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
      Logger.error('errorMessageForId ' + e);
      console.log('errorMessageForId ' + e);
      reject(e);
    }
  });
}

export const sorryMessage = async (context) => {
  await context.sendActivity( `처리할 수 없는 메시지입니다. 다시 시도해주세요.`);
}

export const viewCommandList = async(context) => {
  await context.sendActivity( `콜슨은 버튼 클릭하는 방식 외에도, 명령어 입력 방식으로도 활용 가능합니다. 
  
  아래 명령어 예시를 참고하시기 바랍니다.

  ㅤ

  홈, HOME -> 홈 화면 표시

  ㅤ
  
  근무지 홍길동 -> 홍길동 님의 14일 간의 근무지 데이터 조회 (공휴일 제외)

  ㅤ
  
  근무지 홍길동 10 -> 홍길동 님의 10일 간의 근무지 데이터 조회 (공휴일 제외)

  ㅤ
  
  근무지 등록 -> 근무지 등록 화면 표시

  ㅤ
  
  메시지 -> 받는사람이 공백인 상태로 익명 메시지 발송 화면 표시

  ㅤ
  
  메시지 홍길동 -> 받는사람이 홍길동인 상태로 익명 메시지 발송 화면 표시

  ㅤ
  
  비플식권페이, 비식페, 식사, 점심 -> 비플식권페이 가맹점 조회 화면 표시

  ㅤ
  
  식사랜덤 -> 식사 랜덤 뽑기 화면 표시 # 현재 미구현입니다.`);
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