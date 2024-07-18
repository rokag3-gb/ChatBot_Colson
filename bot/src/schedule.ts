//import { setWorkplaceForm } from "./bot/setWorkplace";
import { sendBirthdayCard } from "./bot/birthMessage";
import { insertLog } from "./bot/common";

const cron = require('node-cron');

export const initCron = () => {  
  // cron.schedule('00 30 08 * * *', async () => {  
  //   await insertLog('setWorkplaceForm send', `오늘 하루도 고생많으셨습니다.`);
  //   await setWorkplaceForm(null, null, null, 'send');
  // });
  
  //생일자에게 카드 전송
  cron.schedule('00 30 01 * * *', async () => {  
    await insertLog('sendBirthdayCard', `start`);
    await sendBirthdayCard();
  });
}