import { bot } from "../../internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "../../adaptiveCards/sendCommand.json";
import sendCommandListTemplate from "../../adaptiveCards/sendCommandList.json";
import { CardFactory } from "botbuilder";
import { Member, TeamsBotInstallation } from "@microsoft/teamsfx"
import { UspSetAppUser, UspGetUsers, UspSetAppLog, UspSetGroupChat, UspGetGroupChat } from "./query"
import { pushPeople } from "../conversation"
import { Logger } from "../../logger";

export const userMap = new Object();
export const groupChatMap = new Object();
export let userCount = 0;
export let parent:TeamsBotInstallation = null;

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

  for (const target of installations) {    
    if(target.type === 'Person') {    
      try {
        const members = await target.members();
        for(const member of members) {
          if(member.account.id.indexOf(userId) >= 0 || userId === null) {
            try {
              if(!parent) {
                parent = member.parent;
                userCount = members.length;
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
  }
  Logger.info('userRegister complete');
  console.log('userRegister complete');
}

export const groupRegister = async (groupId: string) => {
  const installations = await bot.notification.installations();

  for (const target of installations) {    
    if (target.type === 'Group') {
      if(!parent) {
        const members = await target.members();
        if(members.length >= 1) {
          parent = members[0].parent;
        }
      }
      await UspSetGroupChat(target.conversationReference.conversation.id, target.conversationReference.conversation.name, JSON.stringify(target));
      groupChatMap[target.conversationReference.conversation.id] = target;
      console.log('userRegister ' + target.conversationReference.conversation.id);
    }
  }
  Logger.info('groupRegister complete');
  console.log('groupRegister complete');
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

export const getGroupChatList = async () => {
  const rows = await UspGetGroupChat();
  for(const row of rows) {
    const groupChat = groupChatMap[row.groupChatId];
    if(!groupChat && row.GroupChatObject && parent) {
      const tmpTarget = <TeamsBotInstallation>JSON.parse(row.GroupChatObject);
      const groupTarget = <TeamsBotInstallation>new TeamsBotInstallation(parent.adapter, tmpTarget.conversationReference);
      
      groupChatMap[groupTarget.conversationReference.conversation.id] = groupTarget;
      console.log('getGroupChatList ' + groupTarget.conversationReference.conversation.id);
    }
  }
  Logger.info('getGroupChatList complete');
  console.log('getGroupChatList complete');
}

export const insertLog = async (userId, body) => {
  let userInfo = '';
  const user = userMap[userId]

  if(user) {
    userInfo = user.account.userPrincipalName;
  } else {
    userInfo = userId
  }

  await UspSetAppLog(getTodayTime(), userInfo, body);
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
  const card = AdaptiveCards.declare(sendCommandListTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
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

export const SendGroupChatMessage = async (id: string, message: string) => {
  if(!id || !message) {
    console.log(' id = ' + id);
    console.log(' message = ' + message);
    return "Invalid message";
  }

  const groupChat = <TeamsBotInstallation>groupChatMap[id];
  if(!groupChat) {
    return "Invalid chat Id";
  }

  return JSON.stringify(await groupChat.sendMessage(message));
}