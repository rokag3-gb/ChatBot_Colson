import { sql } from "../../mssql"
import { query } from "../common";

export const UspGetUsers = async (): Promise<any[]> => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users] @appId`);
}

export const UspGetWorkplace = async (name: string, date: Int16Array): Promise<any[]> => {
  const request = new sql.Request();
  request.input('Username', sql.VarChar, name);
  request.input('date', sql.Int, 7);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Workplace] @Username, @date`);
}