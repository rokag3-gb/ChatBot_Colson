import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const UspGetUsers = async (): Promise<any[]> => {
  const request = await getRequest();
  await request.input('appId', sql.VarChar, process.env.BOT_ID);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users] @appId`);
}

export const UspGetWorkplace = async (name: string, date: number): Promise<any[]> => {
  const request = await getRequest();
  request.input('Username', sql.VarChar, name);
  request.input('date', sql.Int, date);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Workplace] @Username, @date`);
}