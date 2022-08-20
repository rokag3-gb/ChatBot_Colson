import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { WorkplaceCardData } from "../../model/cardModels";
import { CardFactory } from "botbuilder";
import { getToday, checkWeekday, userMap, errorMessageForContext } from "../common";
import { UspGetWorkCode, UspGetUserWorkplace, UspGetUserWorkplaceSend, UspGetUserWorkplaceResend, UspSetWorkplace } from "./query";
import workplaceTemplate from "../../adaptiveCards/insertWorkplace.json";
    
export const setWorkplaceForm = async (context, userId, username, type, message) => {
  if(!userId && checkWeekday(new Date())) {
    return;
  }
  if(userId) {
    await context.sendActivity(`근무지 등록을 선택하셨습니다.`);
  }

  const choiceList = [];
  const rows = await UspGetWorkCode();
  for(const row of rows) {
    choiceList.push({"title" : row.Name, "value" : row.Code});
  }

  if(type === 'work') {
    await userWorkplace(context, userId, username, choiceList, message);
  } else if(type === 'send') {
    await userWorkplaceSend(choiceList, message);
  } else if(type === 'resend') {
    await userWorkplaceResend(choiceList, message);
  }
}

//특정 유저의 근무지 등록을 위한 함수
const userWorkplace = async (context, userId, username, choiceList, message) => {
  const fromUser = userMap[userId];
  let user = null;
  let UPN = '';

  if(username) {
    for (const u of Object.entries(userMap)) {
      if(u[1].FullNameKR === username) {
        user = u[1];
        break;
      }
    }
    if(!user) {
      await context.sendActivity(`'${username}' 님을 찾을 수 없습니다.`);
      return
    }
    await context.sendActivity( `'${username}' 님의 근무지를 등록합니다.`);
    UPN = user.account.userPrincipalName;
  } else {
    UPN = fromUser.account.userPrincipalName;
  }

  const rows = await UspGetUserWorkplace(UPN);
  for(const row of rows) {
    await sendWorkplaceCardContext(context, userId, choiceList, row.WorkCodeAM, row.WorkCodePM, user, message); 
  }
}

//전체 유저의 근무지 등록을 위한 함수
export const userWorkplaceSend = async (choiceList, message) => {
  const rows = await UspGetUserWorkplaceSend();
  for(const row of rows) {
    await sendWorkplaceCardUserId(row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null, message);
  }
}

//근무지 등록을 하지 않은 유저의 근무지 등록을 위한 함수
const userWorkplaceResend = async (choiceList, message) => {
  const rows = await UspGetUserWorkplaceResend();
  for(const row of rows) {
    await sendWorkplaceCardUserId(row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null, message);
  }
}

const sendWorkplaceCardContext = async (context, userId, choiceList, WorkCodeAM, WorkCodePM, user, message) => {
  const fromUser = userMap[userId];
  const day1 = getToday(null);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceTemplate));

  if(!user) {
    tmpTemplate.body[3].value = fromUser.account.userPrincipalName;
    tmpTemplate.body[3].choices.push({
      "title": fromUser.FullNameKR,
      "value": fromUser.account.userPrincipalName
    });
  } else {
    tmpTemplate.body[3].value = user.account.userPrincipalName;
    tmpTemplate.body[3].choices.push({
      "title": user.FullNameKR,
      "value": user.account.userPrincipalName
    });
  }

  tmpTemplate.body[4].value = day1;
  tmpTemplate.body[5].choices = choiceList;
  tmpTemplate.body[5].value = WorkCodeAM;
  tmpTemplate.body[6].choices = choiceList;
  tmpTemplate.body[6].value = WorkCodePM;

  let title = '근무지 등록';
  let button = '등록';
  let bodyMessage = '';
  if(!message) {
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록합니다.`
  } else if(WorkCodeAM && WorkCodePM) {
    title = '근무지 확인';
    button = '수정';
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 오늘 근무지가 맞나요?`
  } else {
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록해주세요`
  }

  const card = AdaptiveCards.declare(tmpTemplate).render({
    title: title,
    subtitle: message,
    body: bodyMessage,
    button: button
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const sendWorkplaceCardUserId = async (userId, choiceList, WorkCodeAM, WorkCodePM, user, message) => {
  const fromUser = userMap[userId];
  const day1 = getToday(null);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceTemplate));

  if(!user) {
    tmpTemplate.body[3].value = fromUser.account.userPrincipalName;
    tmpTemplate.body[3].choices.push({
      "title": fromUser.FullNameKR,
      "value": fromUser.account.userPrincipalName
    });
  } else {
    tmpTemplate.body[3].value = user.account.userPrincipalName;
    tmpTemplate.body[3].choices.push({
      "title": user.FullNameKR,
      "value": user.account.userPrincipalName
    });
  }

  tmpTemplate.body[4].value = day1;
  tmpTemplate.body[5].choices = choiceList;
  tmpTemplate.body[5].value = WorkCodeAM;
  tmpTemplate.body[6].choices = choiceList;
  tmpTemplate.body[6].value = WorkCodePM;

  let title = '근무지 등록';
  let button = '등록';
  let bodyMessage = '';
  if(!message) {
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록합니다.`
  } else if(WorkCodeAM && WorkCodePM) {
    title = '근무지 확인';
    button = '수정';
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 오늘 근무지가 맞나요?`
  } else {
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록해주세요`
  }      
  await fromUser.sendAdaptiveCard(
    AdaptiveCards.declare<WorkplaceCardData>(tmpTemplate).render({
      title: title,
      subtitle: message,
      body: bodyMessage,
      button: button
    })
  );
}

export const setWorkplace = async (context, id, upn, workDate, workCodeAM, workCodePM) => {
  const user = userMap[id];
  if(!user) {
    await context.sendActivity(`잘못된 정보가 전달되었습니다.`);
    return;
  }

  const rows = await UspSetWorkplace(workDate, upn, workCodeAM, workCodePM, user.account.userPrincipalName);
  for(const row of rows) {
    await context.sendActivity(`${user.FullNameKR}님의 ${workDate} 일자 근무지가 입력되었습니다. (${row.WorkNameAM}${workCodePM?'/'+row.WorkNamePM:''})`);
  }
}