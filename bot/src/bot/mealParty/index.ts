import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import createpartyCard from "../../adaptiveCards/createParty.json";
import joinParty from "../../adaptiveCards/joinParty.json";
import { CardFactory, TurnContext } from "botbuilder";
import { groupChatMap, userMap, } from "../common"
import { UspSetMealParty, UspSetMealPartyMember, CheckUser, CheckParty } from "./query"
import { TeamsBotInstallation, Member, } from "@microsoft/teamsfx"
import { v1 } from 'uuid';
import { Mutex } from 'async-mutex'

const mutex = new Mutex();
         
export const requestCreatePartyCard = async (context: TurnContext) => {
  const tmpTemplate = JSON.parse(JSON.stringify(createpartyCard));

  const card = AdaptiveCards.declare(tmpTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}
         
export const requestCreateParty = async (context: TurnContext) => {
  try {
    const tmpTemplate = JSON.parse(JSON.stringify(joinParty));
  
    // 여기에 이미 방에 참가되어있는지 체크하는 부분
  
    
    const user = <Member>userMap[context.activity.from.id];
    if(!user) {
      return "Invalid user";
    }
  
    const groupChat = <TeamsBotInstallation>groupChatMap['19:38eedc23cf5b48d9aaff7f0aceac0fc6@thread.v2'];
    if(!groupChat) {
      return "Invalid chat Id";
    }
  
    const uuid = v1();
    await UspSetMealParty(uuid, context.activity.value.partyName, context.activity.value.numberOfPeaple, user.account.userPrincipalName);
  
    const card = AdaptiveCards.declare(tmpTemplate).render({
      partyTitle: context.activity.value.partyName,
      numberOfPeaple: '1/' + context.activity.value.numberOfPeaple,
      nickname: context.activity.value.nickname,
      message: context.activity.value.message,
      partyId: uuid
    });
  
    return JSON.stringify(await groupChat.sendAdaptiveCard(card));
  } catch(e) {
    console.log(e);
  }
}
         
export const requestJoinParty = async (context: TurnContext) => {
  try {
    /*
    const checkUser = await CheckUser(context.activity.from.id)
    if(!checkUser) {
      console.log("이미 다른 파티에 가입되어있음");
      return "이미 다른 파티에 가입되어있음";
    }
    */

    await mutex.runExclusive(async () => {
      const checkParty = await CheckParty(context.activity.value.partyId);
      if(!checkParty) {

        console.log("파티가 이미 가득 참");
        return "파티가 이미 가득 참";
      }

      await UspSetMealPartyMember(context.activity.value.partyId, context.activity.from.id);
    });
    
    console.log(JSON.stringify(context.activity.value));
  } catch(e) {
    console.log(e);
  }
}