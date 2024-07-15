import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { WorkplaceCardData, WorkplaceFinishCardData } from "../../model/cardModels";
import { CardFactory } from "botbuilder";
import { getToday, checkWeekday, insertLog } from "../common";
import { UspGetUsersById, UspGetUsersByUPN } from "../common/query";
import { UspGetWorkCode, UspGetUserWorkplace, UspGetUserWorkplaceSend, UspSetWorkplace } from "./query";
import workplaceTemplate from "../../adaptiveCards/insertWorkplace.json";
import workplaceFinishTemplate from "../../adaptiveCards/insertWorkplaceFinish.json";
    
export const setWorkplaceForm = async (context, userId, username, type) => {
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
    await userWorkplace(context, userId, username, choiceList);
  } else if(type === 'send') {
    await userWorkplaceSend(choiceList);
  }
}

//특정 유저의 근무지 등록을 위한 함수
const userWorkplace = async (context, userId, username, choiceList) => {
  const fromUser = await UspGetUsersById(userId);

  const user = await UspGetUsersByUPN(username)
  if(!user) {
    await context.sendActivity(`'${username}' 님을 찾을 수 없습니다.`);
    return
  }

  const UPN = user.AppUPN;

  const rows = await UspGetUserWorkplace(UPN);
  for(const row of rows) {
    await sendWorkplaceCardContext(context, userId, choiceList, row.WorkCodeAM, row.WorkCodePM, user); 
  }
}

//전체 유저의 근무지 등록을 위한 함수
export const userWorkplaceSend = async (choiceList) => {
  const rows = await UspGetUserWorkplaceSend('pm');
  let curId = '';
  for(const row of rows) {
    try {
      curId = row.AppUserId;
      await insertLog('userWorkplaceSend ' + curId, row.NextWorkingDay + ', ' + getToday(null));
      if((row.WorkCodePM !== 'WRK-OFF')) {
        if(row.NextWorkingDay == undefined || row.NextWorkingDay == null) {
          await sendWorkplaceFinishCardUserId(row.AppUserId, '한주를 마무리하며')
        } else {
          await sendWorkplaceCardUserId(row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null, '오늘 하루도 고생많으셨습니다.');
        }
      }
    } catch(e) {
      await insertLog('userWorkplaceSend ' + curId, "Error : " + JSON.stringify(e) + ", " + e.message);
    }
  }
}

const sendWorkplaceCardContext = async (context, userId, choiceList, WorkCodeAM, WorkCodePM, user) => {
  const fromUser = await UspGetUsersById(userId);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceTemplate));

  if(!user) {
    tmpTemplate.body[3].value = fromUser.UPN;
    tmpTemplate.body[3].choices.push({
      "title": fromUser.FullNameKR,
      "value": fromUser.UPN
    });
  } else {
    tmpTemplate.body[3].value = user.UPN;
    tmpTemplate.body[3].choices.push({
      "title": user.FullNameKR,
      "value": user.UPN
    });
  }

  tmpTemplate.body[4].value = getToday(1);
  tmpTemplate.body[5].choices = choiceList;
  tmpTemplate.body[5].value = WorkCodeAM;
  tmpTemplate.body[6].choices = choiceList;
  tmpTemplate.body[6].value = WorkCodePM;

  let title = '근무지 등록';
  let button = '등록';
  let bodyMessage = '';

  if(WorkCodeAM && WorkCodePM) {
    title = '근무지 확인';
    button = '수정';
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 계획했던 내일 근무지에 변동이 있나요?`
  } else {
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 근무지를 등록합니다.`
  }

  const card = AdaptiveCards.declare(tmpTemplate).render({
    title: title,
    subtitle: '',
    body: bodyMessage,
    button: button
  });
  await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
}

const sendWorkplaceCardUserId = async (userId, choiceList, WorkCodeAM, WorkCodePM, user, message) => {
  const fromUser = await UspGetUsersById(userId);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceTemplate));

  if(!user) {
    tmpTemplate.body[3].value = fromUser.UPN;
    tmpTemplate.body[3].choices.push({
      "title": fromUser.FullNameKR,
      "value": fromUser.UPN
    });
  } else {
    tmpTemplate.body[3].value = user.UPN;
    tmpTemplate.body[3].choices.push({
      "title": user.FullNameKR,
      "value": user.UPN
    });
  }

  tmpTemplate.body[4].value = getToday(1);
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
    bodyMessage = `${tmpTemplate.body[3].choices[0].title} 님의 계획했던 내일 근무지에 변동이 있나요?`
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

const sendWorkplaceFinishCardUserId = async (userId, message) => {
  const fromUser = await UspGetUsersById(userId);
  const tmpTemplate = JSON.parse(JSON.stringify(workplaceFinishTemplate));

  let title = '다음 주 근무지 등록';
  let bodyMessage = `${fromUser.FullNameKR} 님의 다음 주 근무지를 등록해 주세요`;

  await fromUser.sendAdaptiveCard(
    AdaptiveCards.declare<WorkplaceFinishCardData>(tmpTemplate).render({
      title: title,
      subtitle: message,
      body: bodyMessage
    })
  );
}


export const setWorkplace = async (context, id, upn, workDate, workCodeAM, workCodePM) => {
  const user = await UspGetUsersById(id);
  if(!user) {
    await context.sendActivity(`잘못된 정보가 전달되었습니다.`);
    return;
  }

  const rows = await UspSetWorkplace(workDate, upn, workCodeAM, workCodePM, user.UPN);
  for(const row of rows) {
    await context.sendActivity(`${user.FullNameKR}님의 ${workDate} 일자 근무지가 입력되었습니다. (${row.WorkNameAM}${workCodePM?'/'+row.WorkNamePM:''})`);
  }
}