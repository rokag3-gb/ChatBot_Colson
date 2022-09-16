import { TurnContext } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardFactory } from "botbuilder";
import randomMealStore from "../../adaptiveCards/randomMealStore.json";
import randomMealStoreUpdate from "../../adaptiveCards/randomMealStoreUpdate.json";
import randomMealStoreOpen from "../../adaptiveCards/randomMealStoreOpen.json";
import { userMap } from "../common"
import { icon_normal_1,
        icon_normal_2,
        icon_normal_3,
        icon_select_1,
        icon_select_2,
        icon_select_3,
        icon_gray_1,
        icon_gray_2,
        icon_gray_3,} from "../../image"
import { UspSetMealStoreLotsPick, UspLotMealStore } from "./query"
import ACData = require("adaptivecards-templating");

export const randomStoreSelect = async (context: TurnContext) => {
  const user = userMap[context.activity.from.id];
  const row = await UspLotMealStore(user.account.userPrincipalName);
  const data = JSON.parse(row[0].LotData);

  const tmpTemplate = JSON.parse(JSON.stringify(randomMealStore));
  const card = AdaptiveCards.declare(tmpTemplate).render({
    select_01_normal: icon_normal_1,
    select_02_normal: icon_normal_2,
    select_03_normal: icon_normal_3,
    select_01_select: icon_select_1,
    select_02_select: icon_select_2,
    select_03_select: icon_select_3,
    store01: JSON.stringify({StoreName : data[0].StoreName, Category : data[0].Category, URL : data[0].URL}),
    store02: JSON.stringify({StoreName : data[1].StoreName, Category : data[1].Category, URL : data[1].URL}),
    store03: JSON.stringify({StoreName : data[2].StoreName, Category : data[2].Category, URL : data[2].URL}),
    LotId: row[0].LotId,
    StoreId01: data[0].StoreId,
    StoreId02: data[1].StoreId,
    StoreId03: data[2].StoreId,
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const randomStoreSelectUpdate = async (context: TurnContext) => {
  const tmpTemplate = JSON.parse(JSON.stringify(randomMealStoreUpdate));
  let icon1 = "";
  let icon2 = "";
  let icon3 = "";

  if(context.activity.value.iconId === 1) {
    icon1 = icon_select_1;
  } else {
    icon1 = icon_gray_1;
  }

  if(context.activity.value.iconId === 2) {
    icon2 = icon_select_2;
  } else {
    icon2 = icon_gray_2;
  }

  if(context.activity.value.iconId === 3) {
    icon3 = icon_select_3;
  } else {
    icon3 = icon_gray_3;
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
  await UspSetMealStoreLotsPick(Number(context.activity.value?.LotId), '', Number(context.activity.value.StoreId));

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