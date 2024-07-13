import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { BirthOpenData } from "../../model/cardModels";
import openBirthMessageTemplate from "../../adaptiveCards/openBirthMessage.json";
import sendBirthMessageTemplate from "../../adaptiveCards/sendBirthMessage.json";
import { CardFactory } from "botbuilder";
import { getBirthdayLink, getBirthdayUser, setSendBirth, setOpenBirth } from "./query";
import { makeUserObject } from "../common";

import { birth_background } from "../../image"

export const sendBirthdayCard = async () => {
  const userList = await getBirthdayUser();
  if(userList.length === 0) {
    return;
  }

  for(const userInfo of userList) {
    const userObject = await makeUserObject(userInfo.AppUserId);
    if(!userObject) {
      continue;
    }    
    const row = await setSendBirth(userInfo.UPN, userInfo.BirthDate);
    const msgId = row[0].birthId;
    await userObject.sendAdaptiveCard(
      AdaptiveCards.declare<BirthOpenData>(openBirthMessageTemplate).render({
        messageId: msgId,
        birthDate: userInfo.BirthDate,
        username: userInfo.DisplayName
      })
    );
  }
}

export const openBirthMessage = async (context, messageId, username, birthDate) => {
  const d = new Date(birthDate);

  await makeAndSendCard(context, d, messageId, username);
}

export const openBirthdayCardTest = async (context) => {
  const d = new Date();
  const username = '테스트';

  await makeAndSendCard(context, d, null, username);
}

const makeAndSendCard = async (context, d, messageId, username) => {
  const birthDateKr = ("00" + (d.getMonth() + 1)).slice(-2) + "월 " + ("00" + d.getDate()).slice(-2) + "일";

  const link = await getBirthdayLink();
  const tmpTemplate = JSON.parse(JSON.stringify(sendBirthMessageTemplate));

  for(const row of link) {
    tmpTemplate.actions.push({
      type: "Action.OpenUrl",
      title: row.LinkName,
      url: row.Link,
    });
  }

  let background = birth_background;
  if(messageId !== null) {
    await setOpenBirth(messageId);  
  }

  const card = AdaptiveCards.declare(tmpTemplate).render({
    background: background,
    title: `${birthDateKr}은 ${username} 님의 생일입니다.`,
    bodyTop: `♥Birthday 유급 휴일 부여♥`,
    bodyBottom: `${username} 님 생일 축하해요!
    
    소중하고 행복한 하루 보내세요 :)`
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}