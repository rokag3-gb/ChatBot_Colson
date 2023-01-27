import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import createpartyCard from "../../adaptiveCards/createParty.json";
import joinPartyCard from "../../adaptiveCards/joinParty.json";
import { CardFactory, TurnContext } from "botbuilder";
import { groupChatMap, userMap, } from "../common"
import { UspSetMealParty, UspSetMealPartyMember, CheckUser, CheckParty, GetPartyMember, UspSetPartyClose } from "./query"
import { TeamsBotInstallation, Member, } from "@microsoft/teamsfx"
import { v1 } from 'uuid';
import { Mutex } from 'async-mutex'
import ACData = require("adaptivecards-templating");
import axios from 'axios'

const mutex = new Mutex();
         
export const requestCreatePartyCard = async (context: TurnContext) => {
  const tmpTemplate = JSON.parse(JSON.stringify(createpartyCard));

  const card = AdaptiveCards.declare(tmpTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}
         
export const requestCreateParty = async (context: TurnContext) => {
  try {  
    /*
    const checkUser = await CheckUser(context.activity.from.id)
    if(!checkUser) {
      console.log("이미 다른 파티에 가입되어있음");
      await user.sendMessage('이미 다른 모임에 참가중입니다!');
      return "이미 다른 파티에 가입되어있음";
    }
    */
    
    const user = <Member>userMap[context.activity.from.id];
    if(!user) {
      return "Invalid user";
    }
  
    const groupChat = <TeamsBotInstallation>groupChatMap['19:38eedc23cf5b48d9aaff7f0aceac0fc6@thread.v2'];
    groupChat.conversationReference.bot.id
    if(!groupChat) {
      return "Invalid chat Id";
    }
  
    const uuid = v1();
    await UspSetMealParty(uuid, context.activity.value.partyName, context.activity.value.numberOfPeaple, user.account.userPrincipalName);
    await UspSetMealPartyMember(uuid, context.activity.from.id, context.activity.from.aadObjectId);

    const tmpTemplate = JSON.parse(JSON.stringify(joinPartyCard));  
    const card = AdaptiveCards.declare(tmpTemplate).render({
      partyTitle: context.activity.value.partyName,
      numberOfPeaple: '1/' + context.activity.value.numberOfPeaple,
      nickname: context.activity.value.nickname,
      message: context.activity.value.message,
      partyId: uuid
    });

    await context.sendActivity('식사 모임이 생성되었습니다!');
  
    const cardResult = await groupChat.sendAdaptiveCard(card)
    console.log('cardResult : ' + JSON.stringify(cardResult));
    return JSON.stringify(cardResult);
  } catch(e) {
    console.log(e);
  }
}
         
export const requestJoinParty = async (context: TurnContext) => {
  try {
    const user = <Member>userMap[context.activity.from.id];
    if(!user) {
      return "Invalid user";
    }
    
    /*
    const checkUser = await CheckUser(context.activity.from.id)
    if(!checkUser) {
      console.log("이미 다른 파티에 가입되어있음");
      await user.sendMessage('이미 다른 모임에 참가중입니다!');
      return "이미 다른 파티에 가입되어있음";
    }
    */

    const maxNumberOfPeaple = context.activity.value.numberOfPeaple.split('/')[1] * 1;
    let member = null;

    const result = await mutex.runExclusive(async () => {
      const checkParty = await CheckParty(context.activity.value.partyId);
      if(!checkParty) {
        console.log("파티가 이미 가득 참");
        return false;
      }

      await UspSetMealPartyMember(context.activity.value.partyId, context.activity.from.id, context.activity.from.aadObjectId);
      member = await GetPartyMember(context.activity.value.partyId);
      return true;
    });
    if(!result) {
      await user.sendMessage('해당 식사 모임은 인원이 가득 찼습니다.');
      return;
    }

    const tmpTemplate = JSON.parse(JSON.stringify(joinPartyCard));
    if(member.length === maxNumberOfPeaple) {
      tmpTemplate.actions = [];
      tmpTemplate.body[1].text = '이 식사 모임은 인원이 가득 차 마감되었습니다. 감사합니다!'
    }

    const cardTemplate = new ACData.Template(tmpTemplate);
    const cardWithData = cardTemplate.expand({ $root: {
      partyTitle: context.activity.value.partyTitle,
      numberOfPeaple: member.length + '/' + maxNumberOfPeaple,
      nickname: context.activity.value.nickname,
      message: context.activity.value.message,
      partyId: context.activity.value.partyId
    }});
    const card = CardFactory.adaptiveCard(cardWithData);

    await context.updateActivity({
      type: "message",
      id: context.activity.replyToId,
      attachments: [card],
    });
    
    await user.sendMessage('식사 모임에 참가하였습니다!');

    if(member && maxNumberOfPeaple === member.length) {
      await UspSetPartyClose(context.activity.value.partyId);
      await createGroupChat(context.activity.value.partyTitle, member);
    }

    
    console.log(JSON.stringify(context.activity.value));
  } catch(e) {
    console.log(e);
  }
}

export const createGroupChat = async (title: string, users: any[]) => {
  const token = await GetToken();
  await MakeGroupChat(token, title, users);
}


async function GetToken() {
  const res = await axios.post('https://login.microsoftonline.com/6d5ac8ee-3862-4452-93e7-a836c2d9742b/oauth2/token',
  `grant_type=client_credentials&client_id=912158a0-780e-4e43-95df-a465c5767e18&client_secret=ZjN8Q~-lZFr_R~NV~sNhPfEPZAAg3wtur3xc5c-p&resource=https://graph.microsoft.com/`,
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return res.data.access_token;
}

async function MakeGroupChat(access_token: string, title: string, users: any[]) {
  try {
    const chatData = makeGroupChatData(title, users);
    const res = await axios.post('https://graph.microsoft.com/v1.0/chats', chatData,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    });

    
    console.log('res = ', res);
  } catch(e) {
    console.log('error : ', e);
    console.log('error2 : ', JSON.stringify(e.response.data));
  }
}

const makeGroupChatData = (title: string, users: any[]) => {
  const chatData = {
    chatType: 'group',
    topic: title,
    members: [
    ]
  }

  for(const u of users) {
    const data = {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      roles: ["owner"],
      'user@odata.bind': "https://graph.microsoft.com/v1.0/users('" + u.aadObjectId +"')"
    }

    chatData.members.push(data);
  }

  return chatData;
}

