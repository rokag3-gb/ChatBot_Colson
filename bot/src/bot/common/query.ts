import { sql } from "../../mssql"
import { query } from "./index"

export const UspSetAppUser = async (id: string, upn: string, userObject: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('userId', sql.VarChar, id);
  request.input('upn', sql.VarChar, upn);
  request.input('userObject', sql.VarChar, userObject);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_App_User] @appId, @upn, @userId, @userObject`);
}

export const UspGetUsers = async (): Promise<any[]> => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users] @appId`);
}

export const UspSetAppLog = async (ts: string, upn: string, body: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input("ts", sql.VarChar, ts) ;
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('upn', sql.VarChar, upn);
  request.input('body', sql.VarChar, body);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_App_Log] @ts, @appId, @upn, @body`);
}

export const UspGetTeam = async (upn: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('UPN', sql.VarChar, upn);

  return query(request, `SELECT
    [TeamName]
    ,[TeamAbbrName]
    ,CASE WHEN [TeamName] = (SELECT TeamName FROM [IAM].[bot].[VW_User] WHERE UPN = @UPN) THEN 1 ELSE 0 END AS userTeam
    FROM [IAM].[dbo].[Teams]
    WHERE IsUse = 1
    ORDER BY TeamSort`);
}