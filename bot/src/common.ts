import { bot } from "./internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardData } from "./model/cardModels";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import secretMessageTemplate from "./adaptiveCards/secretMessage.json";
import scheduleUserList from "./adaptiveCards/scheduleUserList.json";
import workplaceTemplate from "./adaptiveCards/insertWorkplace.json";
import sendSecretMessageTemplate from "./adaptiveCards/sendSecretMessage.json";
import openMessageTemplate from "./adaptiveCards/openMessage.json";
import { sql } from "./mssql"

export const userMap = new Object();
const allUserList = new Object();

const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay))

const getToday = (day) => {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
  const koreaTimeDiff = 9 * 60 * 60 * 1000; 
  const date = new Date(utcNow + koreaTimeDiff);

  if(day !== undefined && day !== null) {
    date.setDate(date.getDate() + day);
  }
  return date.getFullYear() + "-" + ("00" + (1 + date.getMonth())).slice(-2) + "-" + ("00" + date.getDate()).slice(-2);
}

const getTodayTime = () => {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
  const koreaTimeDiff = 9 * 60 * 60 * 1000; 
  const d = new Date(utcNow + koreaTimeDiff);
  
  return d.getFullYear() + "-" + ("00" + (d.getMonth() + 1)).slice(-2) + "-" + ("00" + d.getDate()).slice(-2) + " " + 
        ("00" + d.getHours()).slice(-2) + ":" + ("00" + d.getMinutes()).slice(-2) + ":" + ("00" + d.getSeconds()).slice(-2);
}

const checkWeekday = () => {
  const week = new Date().getDay();
  if(week === 0 || week === 6) {
    return true;
  }
  return false;
}

export const sendUserList = async (userID) => {
  await sendMessage(userID, `근무지 조회를 선택하셨습니다.`);
  const ScheduleUserList = scheduleUserList;
  ScheduleUserList.body[0].choices.length = 0;

  for (const user of Object.entries(allUserList)) {
    ScheduleUserList.body[0].choices.push({
      "title": user[1].Name,
      "value": user[1].Name
    })
  }

  if(ScheduleUserList.body[0].choices.length !== 0) {
    ScheduleUserList.body[0].value = ScheduleUserList.body[0].choices[0].value;
  }
  const user = userMap[userID];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData[]>(scheduleUserList).render([])
  );
}

export const sendMessage = async (userID, body) => {
  const user = userMap[userID];
  if(user !== undefined)
  await user.sendMessage(body);
}

export const sendCommand = async (userID) => {
  const user = userMap[userID];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(sendCommandTemplate).render({
      title: `명령 모아보기`,
      body: `명령을 선택해주세요.`,
      date: ``,
    })
  );
}

export const getWorkSchedule = async (id, name, date) => {
  sendMessage(id, `'${name}' 님을 선택하셨습니다.`).then(() => {
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
  });
}

export const userRegister = async (userId) => {
  const installations = await bot.notification.installations();
  for (const target of installations) {
    const members = await target.members();
    for(const member of members) {
      userMap[member.account.id] = member;
      if(member.account.id.indexOf(userId) >= 0 || userId === null) {
        const request = new sql.Request();
        request.stream = true;
        request.input('botId', sql.VarChar, process.env.BOT_ID);
        request.input('userId', sql.VarChar, member.account.id);
        request.input('upn', sql.VarChar, member.account.userPrincipalName);

        request.query(`[IAM].[bot].[Usp_Set_App_User] @botId, @upn, @userId`
          , (err) => {
            if(err){
                return console.log('query error :',err)
            }
        });
      }
    }
  }

  await wait(500);
  console.log('userRegister complete');
}


export const sorryMessage = async (id) => {
  await sendMessage(id,  `죄송합니다.

처리할 수 없는 메시지입니다.`);
}

export const getUserList = async (userId) => {
  const request = new sql.Request();
  request.input('botId', sql.VarChar, process.env.BOT_ID);

  request.query(`EXEC [IAM].[bot].[Usp_Get_Users] @botId`, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {
    allUserList[row.UPN] = ({
      UPN: row.UPN,
      Name: row.DisplayName,
      BirthDate: row.BirthDate
    });
    
    if(row.AppUserId !== null && (userId === row.AppUserId || userId === null)) {
      const user = userMap[row.AppUserId];
      if(user !== undefined && user !== null) {
        userMap[row.AppUserId].account.name = row.DisplayName;
      }
    }
  });
    
  await wait(500);
  console.log('getUserList complete');
}

export const insertLog = async (userId, body) => {
  const request = new sql.Request();
  request.stream = true;

  let userPrincipalName = '';
  const user = userMap[userId]

  if(user !== undefined && user !== null) {
    userPrincipalName = user.account.userPrincipalName;
  }

  request.input("ts", sql.VarChar, getTodayTime()) ;
  request.input('botId', sql.VarChar, process.env.BOT_ID);
  request.input('upn', sql.VarChar, userPrincipalName);
  request.input('body', sql.VarChar, body);

  request.query(`[IAM].[bot].[Usp_Set_App_Log] @ts, @botId, @upn, @body`
  , (err) => {
    if(err) {
        return console.log('query error :',err)
    }
  });
}

export const getWorkCode = async (userId, func, username) => {
  if((userId === undefined || userId === null) && checkWeekday()) {
    return;
  }
  
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

  request.on('done', async result => {
    if(userId !== undefined && userId !== null) {
      userWorkplace(userId, choiceList, username);
    } else {
      func(choiceList);
    }
  });
}

const getUserForName = async (username) => {
  if(username === undefined || username === null) {
    return null;
  }
  for (const user of Object.entries(allUserList)) {
    if(user[1].Name === username) {
      return user[1];
    }
  }

  return null;
}

//특정 유저의 근무지 등록을 위한 함수
export const userWorkplace = async (userId, choiceList, username) => {
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
export const findWorkplace = async (choiceList) => {
  const request = new sql.Request();
  request.input('botId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  const query = `[IAM].[bot].[Usp_Get_Users_Workplace_All] @date, @botId`;

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
export const notFoundWorkplace = async (choiceList) => {
  const request = new sql.Request();
  request.input('botId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  const query = `[IAM].[bot].[Usp_Get_Users_Workplace_Resend] @date, @botId`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {    
    sendWorkplaceCard(row.AppUserId, choiceList, null, null, null);
  });
}

const sendWorkplaceCard = async (userID, choiceList, WorkCodeAM, WorkCodePM, user) => {
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

export const checkSecretMessage = async (body, receiverName) => {
  sendSecretMessageTemplate.body[2].choices.length = 0;

  for (const user of Object.entries(userMap)) {
    sendSecretMessageTemplate.body[2].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      sendSecretMessageTemplate.body[2].value = user[1].account.id;
    }
  }

  const user = userMap[body.from.id];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(sendSecretMessageTemplate).render({
      title: '',
      body: '',
      date: ``,
    })
  );
}

export const viewSecretMessage = async (body, receiverName) => {
  sendSecretMessageTemplate.body[2].choices.length = 0;

  for (const user of Object.entries(userMap)) {
    sendSecretMessageTemplate.body[2].choices.push({
      "title": user[1].account.name,
      "value": user[1].account.id
    });

    if(receiverName === user[1].account.name) {
      sendSecretMessageTemplate.body[2].value = user[1].account.id;
    }
  }

  const user = userMap[body.from.id];
  user.sendAdaptiveCard(
    AdaptiveCards.declare(sendSecretMessageTemplate).render()
  );
}

export const sendSecretMessage = async (body) => {
  const user = userMap[body.from.id];
  const receiver = userMap[body.value.receiver];

  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('Sender', sql.VarChar, user.account.userPrincipalName);
  request.input('SenderNick', sql.VarChar, body.value.senderNick);
  request.input('Receiver', sql.VarChar, receiver.account.userPrincipalName);
  request.input('Contents', sql.VarChar, body.value.message);

  const query = `[IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents`;

  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {
    console.log('row.ID ' + row.ID);
    if(row.ID === -1) {
      user.sendMessage('오늘 이미 3번의 메세지를 전송하셨습니다.');
      return;
    }
    user.sendMessage('메세지가 전송되었습니다.');

    openMessageTemplate.actions[0].data.messageId = row.ID;    
    receiver.sendAdaptiveCard(
      AdaptiveCards.declare(openMessageTemplate).render()
    );
  });
}

export const openSecretMessage = async (body) => {
  const request = new sql.Request();
  console.log('openSecretMessage 01' + JSON.stringify(body))
  request.input('MsgId', sql.BigInt, body.value.messageId);
  request.input('AppId', sql.VarChar, process.env.BOT_ID);

  const query = `[IAM].[bot].[Usp_Get_Send_Message] @MsgId`;

  console.log('openSecretMessage 02')
  request.query(query, (err, result) => {
    if(err){
        return console.log('query error :',err)
    }
  });

  request.on('row', (row) => {
    const user = userMap[body.from.id];
    user.sendAdaptiveCard(
      AdaptiveCards.declare<CardData>(secretMessageTemplate).render({
        title: `${row.SenderNick} 님이 보낸 메시지 입니다.`,
        body: row.Contents,
        date: ``,
      })
    );

    const receiver = userMap[row.Sender];
    if(receiver === undefined || receiver === null) {
      return;
    }
    
    if(row.IsOpen === 0) {
      receiver.sendMessage(`${user.account.name} 님이 메세지를 열어보았습니다.`);
    }
  });
}