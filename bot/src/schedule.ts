import { setWorkplaceForm } from "./bot/setWorkplace";
import { sendBirthdayCard } from "./bot/birthMessage";
import { Logger } from "./logger";

const cron = require('node-cron');

export const initCron = () => {
  //앱서비스의 기본 시간대가 UTC 기준이고 이게 생각보다 자주 초기화 되어서 UTC 기준으로 크론을 작성함
  //휴가자 제외한 전직원에게 근무지 입력 카드 전송

  cron.schedule('00 00 1 * * 1', async () => {
    Logger.info('setWorkplaceForm send 좋은 아침입니다!');
    await setWorkplaceForm(null, null, null, 'send', '좋은 아침입니다!', 'am');
  });
  cron.schedule('00 00 2 * * 1', async () => {  
    Logger.info('setWorkplaceForm resend 좋은 아침입니다!');
    await setWorkplaceForm(null, null, null, 'resend', '좋은 아침입니다!', 'am');
  });


  cron.schedule('00 00 00 * * 2-5', async () => {
    Logger.info('setWorkplaceForm send 좋은 아침입니다!');
    await setWorkplaceForm(null, null, null, 'send', '좋은 아침입니다!', 'am');
  });
  //근무지 입력 안한 사람들에게 카드 전송
  cron.schedule('00 00 1 * * 2-5', async () => {  
    Logger.info('setWorkplaceForm resend 좋은 아침입니다!');
    await setWorkplaceForm(null, null, null, 'resend', '좋은 아침입니다!', 'am');
  });
  

  cron.schedule('00 00 05 * * *', async () => {
    Logger.info('setWorkplaceForm resend 점심 식사 맛있게 하셨나요!');
    await setWorkplaceForm(null, null, null, 'resend', '점심 식사 맛있게 하셨나요!', null);
  });
  
  cron.schedule('00 30 08 * * *', async () => {  
    Logger.info('setWorkplaceForm send 오늘 하루도 고생많으셨습니다.');
    await setWorkplaceForm(null, null, null, 'send', '오늘 하루도 고생많으셨습니다.', 'pm');
  });
  
  //생일자에게 카드 전송
  cron.schedule('00 30 01 * * *', async () => {  
    Logger.info('sendBirthdayCard start');
    await sendBirthdayCard();
  });
}