import { bot } from "../../internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import sendCommandTemplate from "../../adaptiveCards/sendCommand.json";
import sendCommandListTemplate from "../../adaptiveCards/sendCommandList.json";
import { CardFactory } from "botbuilder";
import { Member, TeamsBotInstallation } from "@microsoft/teamsfx"
import { UspSetAppUser, UspSetAppLog, UspSetGroupChat, UspGetUsersById, UspGetGroupChatById } from "./query"

export let userCount = 0;
export let parent:TeamsBotInstallation = null;

export const makeUserObject = async (id: string): Promise<any> => {
  const row = await UspGetUsersById(id)

  const userObj = <Member>JSON.parse(row.AppUserObject);
  const member = <any>new Member(parent, userObj.account);
  member.FullNameKR = row.DisplayName;
  member.LastNameKR = row.LastNameKR;
  member.FirstNameKR = row.FirstNameKR;
  
  return member;
}

export const makeGroupObject = async (id: string): Promise<TeamsBotInstallation> => {
  const row = await UspGetGroupChatById(id)
  
  const tmpTarget = <TeamsBotInstallation>JSON.parse(row.GroupChatObject);
  const groupTarget = <TeamsBotInstallation>new TeamsBotInstallation(parent.adapter, tmpTarget.conversationReference);
  
  (<any>(groupTarget)).TeamName = row.TeamName;

  if(row.GroupName && groupTarget.conversationReference?.conversation?.name !== row.GroupName) {
    (<any>(groupTarget)).Name = row.GroupName;
  }

  return groupTarget;
}

export const getToday = (day: number) => {
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
            } catch (e) {
              await insertLog('userRegister ' + member.account.id, "Error : " + JSON.stringify(e) + ", " + e.message);
            }
          }
        }
      } catch (e) {
        await insertLog('userRegister', "Error : " + JSON.stringify(e) + ", " + e.message);
      }
    }
  }
  await insertLog('userRegister', 'userRegister complete');
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
      await UspSetGroupChat(target.conversationReference.conversation.id, target.conversationReference.conversation.name, JSON.stringify(target), '');
      await insertLog('groupRegister', '['+target.conversationReference.conversation.name+']['+target.conversationReference.conversation.id+']');
    }
    
    if (target.type === 'Channel') {
      if(!parent) {
        const members = await target.members();
        if(members.length >= 1) {
          parent = members[0].parent;
        }
      }
      await UspSetGroupChat(target.conversationReference.conversation.id, target.conversationReference.conversation.name, JSON.stringify(target), '');
      await insertLog('ChannelRegister', '['+target.conversationReference.conversation.name+']['+target.conversationReference.conversation.id+']');
    }
  }
  await insertLog('groupRegister', 'groupRegister complete');
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
  try {
    console.log(userId, body)
    let userInfo = '';
    const user = await(UspGetUsersById(userId))
  
    if(!IsJsonString(body)) {
      body = JSON.stringify({Message: body});
    }
  
    if(user) {
      userInfo = user.AppUPN;
    } else {
      userInfo = userId
    }
  
    await UspSetAppLog(getTodayTime(), userInfo, body);
  } catch(e)  {
    console.log('APP Log Insert Fail!! '+e)
  }
}

export const errorMessageForContext = async (context, err) => {
  return new Promise(async (resolve, reject) => {
    try {
      await context.sendActivity(`에러가 발생했습니다. 다시 시도해주세요.

ㅤ
 
(${err.message})`);
      resolve(true);
    } catch (e) {
      await insertLog('errorMessageForContext', "Error : " + JSON.stringify(e) + ", " + e.message);
      reject(e);
    }
  });
}

export const errorMessageForId = async (id, err) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await UspGetUsersById(id)
      if(user && id) {
        user.sendMessage(`에러가 발생했습니다. 다시 시도해주세요.

ㅤ

(${err.message})`);
      }
      resolve(true);
    } catch (e) {
      await insertLog('errorMessageForId', "Error : " + JSON.stringify(e) + ", " + e.message);
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
  await insertLog('SendGroupChatMessage', id);
  if(!id || !message) {
    console.log('Invalid message id[' + id + '] message[' + message+']');
    return "Invalid message";
  }

  const groupChat = await makeUserObject(id);
  if(!groupChat) {
    console.log('Invalid message id [' + id + ']');
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
            await insertLog('memberSend ' + member.account.id, "Error : " + JSON.stringify(e) + ", " + e.message);
          }
        }
      } catch (e) {
        await insertLog('memberSend', "Error : " + JSON.stringify(e) + "," + e.message);
      }
    }
  }

  await context.sendActivity(emp);
}