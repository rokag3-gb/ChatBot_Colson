import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { BirthOpenData } from "../../model/cardModels";
import openBirthMessageTemplate from "../../adaptiveCards/openBirthMessage.json";
import sendBirthMessageTemplate from "../../adaptiveCards/sendBirthMessage.json";
import { CardFactory } from "botbuilder";
import { getBirthdayLink, getBirthdayUser, setSendBirth, setOpenBirth } from "./query";

import { userMap, imgPath } from "../common";
import imageToBase64 from "image-to-base64";
import { Logger } from "../../logger";

export const sendBirthdayCard = async () => {
  const userList = await getBirthdayUser();
  if(userList.length === 0) {
    return;
  }

  for(const userInfo of userList) {
    const userObject = userMap[userInfo.AppUserId];
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
    Logger.info('sendBirthdayCard ' + userInfo.AppUserId);
  }
}

export const openBirthMessage = async (context, messageId, username, birthDate) => {
  const d = new Date(birthDate);
  const birthDateKr = ("00" + (d.getMonth() + 1)).slice(-2) + "월 " + ("00" + d.getDate()).slice(-2) + "일"

  const link = await getBirthdayLink();
  const tmpTemplate = JSON.parse(JSON.stringify(sendBirthMessageTemplate));

  for(const row of link) {
    tmpTemplate.actions.push({
      type: "Action.OpenUrl",
      title: row.LinkName,
      url: row.Link,
    });
  }

  let background = await imageToBase64(imgPath + "birth_background.jpg");
  await setOpenBirth(messageId);  

  const card = AdaptiveCards.declare(tmpTemplate).render({
    background: background,
    title: `${birthDateKr}은 ${username} 님의 생일입니다.`,
    bodyTop: `${username} 님 생일 축하해요!`,
    bodyBottom: `소중하고 행복한 하루 보내세요 :)`
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}