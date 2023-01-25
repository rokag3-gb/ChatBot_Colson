import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import createpartyCard from "../../adaptiveCards/createParty.json";
import joinParty from "../../adaptiveCards/joinParty.json";
import { CardFactory } from "botbuilder";
import { groupChatMap, } from "../common"
import { TeamsBotInstallation, } from "@microsoft/teamsfx"
         
export const requestCreatePartyCard = async (context) => {
  const tmpTemplate = JSON.parse(JSON.stringify(createpartyCard));

  const card = AdaptiveCards.declare(tmpTemplate).render();
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}
         
export const requestCreateParty = async (context) => {
  const tmpTemplate = JSON.parse(JSON.stringify(joinParty));

  const groupChat = <TeamsBotInstallation>groupChatMap['19:38eedc23cf5b48d9aaff7f0aceac0fc6@thread.v2'];
  console.log(JSON.stringify(groupChatMap));
  if(!groupChat) {
    return "Invalid chat Id";
  }

  const card = AdaptiveCards.declare(tmpTemplate).render({
    partyTitle: `테스트 방`,
    numberOfPeaple: `3/6`,
    nickname: `아핫`,
    message: `미역줄기볶음 먹으러 갈 사람 구합니다.`,
  });
//  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)]});

  return JSON.stringify(await groupChat.sendAdaptiveCard(card));
}