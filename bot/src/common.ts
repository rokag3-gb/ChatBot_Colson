import { bot } from "./internal/initialize";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { CardData } from "./model/cardModels";
import sendCommandTemplate from "./adaptiveCards/sendCommand.json";
import sendMessageTemplate from "./adaptiveCards/sendMessage.json";
import scheduleUserList from "./adaptiveCards/scheduleUserList.json";
import workplaceTemplate from "./adaptiveCards/insertWorkplace.json";
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

export const sendCardMessage = async (userID, title, body) => {
  const user = userMap[userID];
  user.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(sendMessageTemplate).render({
      title: title,
      body: body,
      date: ``,
    })
  );
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

    let message = '';
    const request = new sql.Request();
    request.input('Username', sql.VarChar, name);
    request.input('date', sql.Int, date);
    request.query(`SELECT 
    FORMAT(WC.WorkDate, 'yyyy-MM-dd') as date,
      WC.WorkCodeAM as am,
      WC.WorkCodePM as pm,
        CASE WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '1') THEN '일'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '2') THEN '월'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '3') THEN '화'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '4') THEN '수'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '5') THEN '목'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '6') THEN '금'
          WHEN(DATEPART(WEEKDAY, WC.WorkDate) = '7') THEN '토' END as week
        FROM 
      (SELECT UPN, WorkDate, C1.Name AS WorkCodeAM, C2.Name WorkCodePM
      FROM IAM.bot.Workplace W
      JOIN Sale.dbo.Code C1
      ON W.WorkCodeAM = C1.Code
      JOIN Sale.dbo.Code C2
      ON W.WorkCodePM = C2.Code) WC
      JOIN IAM.dbo.USER_ENTITY U
      ON WC.UPN = U.EMAIL
      WHERE U.FullNameKR = @Username
      AND WC.WorkDate >= GETDATE() - 1 
      AND WC.WorkDate < GETDATE() + @date
      ORDER BY WC.WorkDate`, (err, result) => {
      if(err){
          return console.log('query error :',err)
      }
      if(result.rowsAffected[0] === 0){
        sendMessage(id, `${name} 님의 근무지을 찾을 수 없습니다.`);
      }
    });

    request.on('row', (row) => {
      message += `<tr>
        <td align="center">${row.date}</td>
        <td align="center">${row.week}</td>
        <td align="center">${row.am}</td>
        <td align="center">${row.pm}</td>
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

        request.query(`IF EXISTS (SELECT 1 FROM IAM.bot.App_User WHERE AppId = @botId AND UPN = @upn)
          BEGIN
            UPDATE IAM.bot.App_User 
            SET AppUserId=@userId, SaveDate=GETDATE()
            WHERE UPN = @upn AND AppId = @botId;
          END
          ELSE
          BEGIN
            INSERT INTO IAM.bot.App_User
            (AppId, UPN, AppUserId)
            VALUES
            (@botId, @upn, @userId)
          END`
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

처리할 수 없는 메세지입니다.`);
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
  let query = `SELECT AU.AppUserId, W.UPN, W.WorkCodeAM, W.WorkCodePM FROM
    (select AppId, UPN, AppUserId
    FROM IAM.bot.App_User
    WHERE AppId = @botId) AU
    LEFT OUTER JOIN 
    (SELECT * FROM IAM.bot.Workplace
    WHERE WorkDate = @date) W
    ON AU.UPN = W.UPN 
    WHERE  NOT(W.WorkCodeAM = 'WRK-OFF' AND W.WorkCodePM = 'WRK-OFF') `;

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
  let query = `SELECT AppUserId FROM
	(select AppId, UPN, AppUserId
	FROM IAM.bot.App_User
	WHERE AppId = @botId) AU
	LEFT OUTER JOIN 
	(SELECT * FROM IAM.bot.Workplace
	WHERE WorkDate = @date) W
	ON AU.UPN = W.UPN
	WHERE W.WorkCodeAM IS NULL AND W.WorkCodePM IS NULL `;

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

  const customTemplate = workplaceTemplate;
  
  if(user === undefined || user === null) {
    customTemplate.body[2].value = muser.account.userPrincipalName;
    customTemplate.body[2].choices.push({
      "title": muser.account.name,
      "value": muser.account.userPrincipalName
    });
  } else {
    customTemplate.body[2].value = user.UPN;
    customTemplate.body[2].choices.push({
      "title": user.Name,
      "value": user.UPN
    });
  }

  customTemplate.body[3].min = day1;
  customTemplate.body[3].max = day2;
  customTemplate.body[3].value = day1;

  customTemplate.body[4].choices = choiceList;
  if(WorkCodeAM !== undefined && WorkCodeAM !== null) {
    customTemplate.body[4].value = WorkCodeAM;
  }

  customTemplate.body[5].choices = choiceList;
  if(WorkCodePM !== undefined && WorkCodePM !== null) {
    customTemplate.body[5].value = WorkCodePM;
  }
  
  muser.sendAdaptiveCard(
    AdaptiveCards.declare<CardData>(customTemplate).render({
      title: '근무지 등록',
      body: '근무지를 등록합니다.',
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

  await user.sendMessage(`${userInfo.Name}님의 ${body.value.WorkDate} 일자 업무 근무지이 입력되었습니다.`);
}