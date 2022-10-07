import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const getBirthdayLink = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Birth_Link]`);
}

export const getBirthdayUser = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users_Birthday_Upcoming] @appid = @appId`);
}

export const setSendBirth = async (receiver: string, birthDate: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('receiver', sql.VarChar, receiver);
  request.input('birthDate', sql.VarChar, birthDate);
  return query(request, `[IAM].[bot].[Usp_Set_Send_Birth] @appId, @receiver, @birthDate`);
}

export const setOpenBirth = async (birthId): Promise<any[]> => {
  const request = await getRequest();
  request.input('birthId', sql.BigInt, birthId);
  return query(request, `[IAM].[bot].[Usp_Set_Open_Birth] @birthId`);
}