import { TurnContext } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";
import randomMealStore from "../../adaptiveCards/randomMealStore.json";
import randomMealStoreUpdate from "../../adaptiveCards/randomMealStoreUpdate.json";
import randomMealStoreOpen from "../../adaptiveCards/randomMealStoreOpen.json";
import imageToBase64 from "image-to-base64";
import { imgPath, userMap } from "../common"
import { UspSetMealStoreLotsPick, UspLotMealStore } from "./query"
import ACData = require("adaptivecards-templating");

const icon01 = [
  "random_01_01.png",
  "random_01_02.png",
  "random_01_03.png"
]

const icon02 = [
  "random_02_01.png",
  "random_02_02.png",
  "random_02_03.png"
]

export const randomStoreSelect = async (context: TurnContext) => {
  const user = userMap[context.activity.from.id];
  const row = await UspLotMealStore(user.account.userPrincipalName);
  const data = JSON.parse(row[0].LotData);

  const tmpTemplate = JSON.parse(JSON.stringify(randomMealStore));
  const icon1 = await imageToBase64(imgPath + icon01[0]);
  const icon2 = await imageToBase64(imgPath + icon01[1]);
  const icon3 = await imageToBase64(imgPath + icon01[2]);

  const card = AdaptiveCards.declare(tmpTemplate).render({
    icon01: icon1,
    icon02: icon2,
    icon03: icon3,
    store01: JSON.stringify({StoreName : data[0].StoreName, Category : data[0].Category, URL : data[0].URL}),
    store02: JSON.stringify({StoreName : data[1].StoreName, Category : data[1].Category, URL : data[1].URL}),
    store03: JSON.stringify({StoreName : data[2].StoreName, Category : data[2].Category, URL : data[2].URL}),
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const randomStoreSelectUpdate = async (context: TurnContext) => {
  const tmpTemplate = JSON.parse(JSON.stringify(randomMealStoreUpdate));
  let icon1 = "";
  let icon2 = "";
  let icon3 = "";

  if(context.activity.value.iconId === 1) {
    icon1 = await imageToBase64(imgPath + icon02[0]);
  } else {
    icon1 = await imageToBase64(imgPath + icon01[0]);
  }

  if(context.activity.value.iconId === 2) {
    icon2 = await imageToBase64(imgPath + icon02[1]);
  } else {
    icon2 = await imageToBase64(imgPath + icon01[1]);
  }

  if(context.activity.value.iconId === 3) {
    icon3 = await imageToBase64(imgPath + icon02[2]);
  } else {
    icon3 = await imageToBase64(imgPath + icon01[2]);
  }

  const cardTemplate = new ACData.Template(tmpTemplate);
  const cardWithData = cardTemplate.expand({ $root: {
    icon01: icon1,
    icon02: icon2,
    icon03: icon3,
  }});
  const card = CardFactory.adaptiveCard(cardWithData);

  await context.updateActivity({
    type: "message",
    id: context.activity.replyToId,
    attachments: [card],
  });
}

export const openRandomStore = async (context: TurnContext) => {
  const tmpTemplate = JSON.parse(JSON.stringify(randomMealStoreOpen));
  const row = JSON.parse(context.activity.value.storeJson);
  
  const card = AdaptiveCards.declare(tmpTemplate).render({
    StoreName: row.StoreName,
    Category: row.Category,
    URL: row.URL
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  await randomStoreSelectUpdate(context);
}