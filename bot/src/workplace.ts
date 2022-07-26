import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardData } from "./model/cardModels";
import workplaceTemplate from "./adaptiveCards/insertWorkplace.json";
import workplaceUserListTemplate from "./adaptiveCards/workplaceUserList.json";
import { sql } from "./mssql"
import { sendMessage, 
         getToday,
         checkWeekday,
         getUserForName,
         userMap,
         allUserList } from "./common";
    
export const setWorkplace = async (userId, username, type) => {
  if((userId === undefined || userId === null) && checkWeekday()) {
    return;
  }

  const choiceList = await getWorkCode();
  if(type === 'work') {
    userWorkplace(userId, username, choiceList);
  } else if(type === 'send') {
    userWorkplaceSend(choiceList);
  } else if(type === 'resend') {
    userWorkplaceResend(choiceList);
  }
}

export const viewWorkplaceUser = async (userId) => {
  await sendMessage(userId, `근무지 조회를 선택하셨습니다.`);
  const workplaceUserList = workplaceUserListTemplate;
  workplaceUserList.body[0].choices.length = 0;

  for (const user of Object.entries(allUserList)) {
    workplaceUserList.body[0].choices.push({
      "title": user[1].Name,
      "value": user[1].Name
    })
  }

  if(workplaceUserList.body[0].choices.length !== 0) {
    workplaceUserList.body[0].value = workplaceUserList.body[0].choices[0].value;
  }
  const user = userMap[userId];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData[]>(workplaceUserList).render([])
  );
}

const getWorkCode = () => {
  return new Promise((resolve, reject) => {
    try {
      const request = new sql.Request();
      const choiceList = [];
      request.query(`SELECT Code, Name from Sale.dbo.Code
      WHERE KindCode = 'WRK' 
      ORDER BY sort ASC`, (err, result) => {
        if(err){
            return console.log('query error :',err)
        }
      });
    
      request.on('row', (row) => {    
        choiceList.push({"title" : row.Name, "value" : row.Code});
      });
    
      request.on('done', () => {
        resolve(choiceList);
      });
    } catch(e) {
      reject(e);
    }
  });
}

//특정 유저의 근무지 등록을 위한 함수
const userWorkplace = async (userId, username, choiceList) => {
  const request = new sql.Request();
  const user = await getUserForName(username);

  if(username !== undefined && username !== null) {
    if(user === undefined || user === null) {
      await sendMessage(userId, `'${username}' 님을 찾을 수 없습니다.`);
      return
    }
    await sendMessage(userId,  `'${username}' 님의 근무지를 등록합니다.`);
    request.input('UPN', sql.VarChar, user.UPN);
  } else {
    const muser = userMap[userId];
    request.input('UPN', sql.VarChar, muser.account.userPrincipalName);
  }

  let query = `EXEC [IAM].[bot].[Usp_Get_Users_Workplace] @date, @UPN`;
  request.input('date', sql.VarChar, getToday(null));
  request.query(query, (err, result) => {
    if(err){
      return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {    
    sendWorkplaceCard(userId, choiceList, row.WorkCodeAM, row.WorkCodePM, user);
  });
}

//전체 유저의 근무지 등록을 위한 함수
export const userWorkplaceSend = async (choiceList) => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  const query = `[IAM].[bot].[Usp_Get_Users_Workplace_All] @date, @appId`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {    
    sendWorkplaceCard(row.AppUserId, choiceList, row.WorkCodeAM, row.WorkCodePM, null);
  });
}

//근무지 등록을 하지 않은 유저의 근무지 등록을 위한 함수
const userWorkplaceResend = async (choiceList) => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  const query = `[IAM].[bot].[Usp_Get_Users_Workplace_Resend] @date, @appId`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {    
    sendWorkplaceCard(row.AppUserId, choiceList, null, null, null);
  });
}

export const sendWorkplaceCard = async (userID, choiceList, WorkCodeAM, WorkCodePM, user) => {
  const muser = userMap[userID];
  const day1 = getToday(null);
  const day2 = getToday(14);
  
  workplaceTemplate.body[2].choices.length = 0;
  if(user === undefined || user === null) {
    workplaceTemplate.body[2].value = muser.account.userPrincipalName;
    workplaceTemplate.body[2].choices.push({
      "title": muser.account.name,
      "value": muser.account.userPrincipalName
    });
  } else {
    workplaceTemplate.body[2].value = user.UPN;
    workplaceTemplate.body[2].choices.push({
      "title": user.Name,
      "value": user.UPN
    });
  }

  workplaceTemplate.body[3].min = day1;
  workplaceTemplate.body[3].max = day2;
  workplaceTemplate.body[3].value = day1;

  workplaceTemplate.body[4].choices = choiceList;
  if(WorkCodeAM !== undefined && WorkCodeAM !== null) {
    workplaceTemplate.body[4].value = WorkCodeAM;
  }

  workplaceTemplate.body[5].choices = choiceList;
  if(WorkCodePM !== undefined && WorkCodePM !== null) {
    workplaceTemplate.body[5].value = WorkCodePM;
  }
  
  muser.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(workplaceTemplate).render({
      title: '근무지 등록',
      body: workplaceTemplate.body[2].choices[0].title,
      date: ``,
    })
  );
}

export const insertWorkplace = async (body) => {
  const request = new sql.Request();
  request.stream = true;

  const user = userMap[body.from.id];
  const userInfo = allUserList[body.value.UPN];

  if(user === undefined || user === null || userInfo === undefined || userInfo === null) {
    await sendMessage(body.from.id, `잘못된 정보가 전달되었습니다.`);
    return;
  }

  request.input("WorkDate", sql.VarChar, body.value.WorkDate) ;
  request.input('UPN', sql.VarChar, body.value.UPN);
  request.input('WorkCodeAM', sql.VarChar, body.value.WorkCodeAM);
  request.input('WorkCodePM', sql.VarChar, body.value.WorkCodePM);
  request.input('SaverUPN', sql.VarChar, user.account.userPrincipalName);

  request.query(`[IAM].[bot].[Usp_Set_Workplace] @WorkDate, @UPN, @WorkCodeAM, @WorkCodePM, @SaverUPN`
    , (err) => {
      if(err){
          return console.log('query error :',err)
      }
  });

  await user.sendMessage(`${userInfo.Name}님의 ${body.value.WorkDate} 일자 업무 근무지가 입력되었습니다.`);
}

export const getWorkplace = async (id, name, date) => {
  await sendMessage(id, `'${name}' 님을 선택하셨습니다.`);
  if(date === undefined || date === null) {
    date = 7;
  }

  const tmp = date * 1;
  if(tmp > 30) {
    date = 30;
  }

  let message = '';
  const request = new sql.Request();
  request.input('Username', sql.VarChar, name);
  request.input('date', sql.Int, date);
  request.query(`[IAM].[bot].[Usp_Get_Workplace] @Username, @date`, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
    if(result.rowsAffected[0] === 0){
      sendMessage(id, `${name} 님의 근무지를 찾을 수 없습니다.`);
    }
  });

  request.on('row', (row) => {
    message += `<tr>
      <td align="center">${row.Date}</td>
      <td align="center">${row.WeekName}</td>
      <td align="center">${row.WorkAM}</td>
      <td align="center">${row.WorkPM}</td>
    </tr>`
  })
  .on('done', async () => { 
    if(message.length >= 1) {
      message = `<h1> ${name} 님의 일정을 조회하였습니다. </h1>
      <div style="width: 500px;">
      <table>
      <thead>
      <tr>
        <th style="background-color:#FF5; color:black;">날짜</th>
        <th style="background-color:#FF5; color:black;">요일</th>
        <th style="background-color:#FF5; color:black;">오전</th>
        <th style="background-color:#FF5; color:black;">오후</th>
      </tr></thead><tbody>` + message + '</tbody></table></div>';
      const user = userMap[id];
      user.sendMessage(message);
    }
  });
}
      