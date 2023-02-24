import { bot } from "../../internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "../../adaptiveCards/sendCommand.json";
import sendCommandListTemplate from "../../adaptiveCards/sendCommandList.json";
import { CardFactory } from "botbuilder";
import { Member, TeamsBotInstallation } from "@microsoft/teamsfx"
import { UspSetAppUser, UspGetUsers, UspSetAppLog, UspSetGroupChat, UspGetGroupChat } from "./query"

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

export const conversationRegister = async (id: string) => {
  const installations = await bot.notification.installations();

  await userRegister(id, installations);
  await groupRegister(installations);
}

export const userRegister = async (userId: string, installations: TeamsBotInstallation[]) => {
  if(userCount === 0) {
    Object.keys(userMap).forEach(key => {
      delete userMap[key];
    });
  }

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
              insertLog('userRegister ' + member.account.id, "Error : " + JSON.stringify(e) + ", " + e.message);
              console.log('userRegister ERROR!! ' + e);
            }
          }
        }
      } catch (e) {
        insertLog('userRegister', "Error : " + JSON.stringify(e) + ", " + e.message);
        console.log('userRegister ERROR2!! ' + e);
      }
    }
  }
  insertLog('userRegister', 'userRegister complete');
  console.log('userRegister complete');
}

export const groupRegister = async (installations: TeamsBotInstallation[]) => {
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
    
    if (target.type === 'Channel') {
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
  insertLog('groupRegister', 'groupRegister complete');
  console.log('groupRegister complete');
}

export const getUserList = async (userId) => {
  const rows = await UspGetUsers();
  for(const row of rows) {
    try {
      if(row.AppUserId && (userId === row.AppUserId || userId === null)) {
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
    } catch (e) {
      insertLog('getUserList ' + row.AppUserId, "Error : " + JSON.stringify(e) + ', ' + e.message);
    }
  }
  insertLog('getUserList', 'getUserList complete');
  console.log('getUserList complete');
}

export const getGroupChatList = async () => {
  const rows = await UspGetGroupChat();
  for(const row of rows) {
    try {
      const groupChat = groupChatMap[row.groupChatId];
      if(!groupChat && row.GroupChatObject && parent) {
        const tmpTarget = <TeamsBotInstallation>JSON.parse(row.GroupChatObject);
        const groupTarget = <TeamsBotInstallation>new TeamsBotInstallation(parent.adapter, tmpTarget.conversationReference);
        
        groupChatMap[groupTarget.conversationReference.conversation.id] = groupTarget;
        console.log('getGroupChatList ' + groupTarget.conversationReference.conversation.id);
      }
    } catch(e) {
      insertLog('getGroupChatList ' + row.AppUserId, "Error : " + JSON.stringify(e) + ', ' + e.message);
    }
  }
  insertLog('getGroupChatList', 'getGroupChatList complete');
  console.log('getGroupChatList complete');
}

const IsJsonString = (str) => {
  try {
    var json = JSON.parse(str);
    return (typeof json === 'object');
  } catch (e) {
    return false;
  }
}

export const insertLog = async (userId, body) => {
  let userInfo = '';
  const user = userMap[userId]

  if(!IsJsonString(body)) {
    body = JSON.stringify({Message: body});
  }

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
      insertLog('errorMessageForContext', "Error : " + JSON.stringify(e) + ", " + e.message);
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
      insertLog('errorMessageForId', "Error : " + JSON.stringify(e) + ", " + e.message);
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

export const memberSend = async(context) => {
  let emp = "";
  const installations = await bot.notification.installations();

  for (const target of installations) {    
    if(target.type === 'Person') {    
      try {
        const members = await target.members();
        for(const member of members) {
          try {
            emp += member.account.userPrincipalName + ",";

          } catch (e) {
            insertLog('memberSend ' + member.account.id, "Error : " + JSON.stringify(e) + ", " + e.message);
            console.log('memberSend ERROR!! ' + e);
          }
        }
      } catch (e) {
        insertLog('memberSend', "Error : " + JSON.stringify(e) + "," + e.message);
        console.log('memberSend ERROR2!! ' + e);
      }
    }
  }

  await context.sendActivity(emp);
}