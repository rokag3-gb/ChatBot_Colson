import { sql } from "../../mssql"
import { query } from "../common";

export const UspSetSendMessage = async (UPN: string, senderNick: string, reciver: string, message: string, background: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('Sender', sql.VarChar, UPN);
  request.input('SenderNick', sql.NVarChar, senderNick);
  request.input('Receiver', sql.VarChar, reciver);
  request.input('Contents', sql.NVarChar, message);
  request.input('Background', sql.VarChar, background);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_Send_Message] @AppId, @Sender, @SenderNick, @Receiver, @Contents, @Background`);
}

export const UspGetSendMessage = async (messageId: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('MsgId', sql.BigInt, messageId);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Send_Message] @MsgId`);
}

export const UspSetSendMessageOpen = async (messageId: string, openedChatId: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('MsgId', sql.BigInt, messageId);
  request.input('OpenedChatId', sql.VarChar, openedChatId);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_Send_Message_Open] @MsgId, @OpenedChatId`);
}

export const UspGetSendMessageChatid = async (activityId: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('OpenedChatId', sql.VarChar, activityId);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Send_Message_Chat_Id] @OpenedChatId, @AppI`);
}