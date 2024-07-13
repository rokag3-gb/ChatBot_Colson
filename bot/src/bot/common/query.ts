import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "./index"

export const UspSetAppUser = async (id: string, upn: string, userObject: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('userId', sql.VarChar, id);
  request.input('upn', sql.VarChar, upn);
  request.input('userObject', sql.VarChar, userObject);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_App_User] @appId, @upn, @userId, @userObject`)
}

export const UspGetUsers = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users] @appId`);
}

export const UspSetAppLog = async (ts: string, upn: string, body: string): Promise<any[]> => {
  const request = await getRequest();
  request.input("ts", sql.VarChar, ts) ;
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('upn', sql.VarChar, upn);
  request.input('body', sql.VarChar, body);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_App_Log] @ts, @appId, @upn, @body`);
}

export const UspGetGroupChat = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_GroupChat] @appId`);
}

export const UspSetGroupChat = async (id: string, name: string, object: string, teamName: string): Promise<any[]> => {
  const request = await getRequest();
  if(!name) {
    name = '';
  }

  request.input('AppId', sql.VarChar, process.env.BOT_ID);
  request.input('GroupId', sql.VarChar, id);
  request.input('GroupName', sql.NVarChar, name);
  request.input('GroupChatObject', sql.VarChar, object);
  request.input('TeamName', sql.NVarChar, teamName);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_App_GroupChat] @AppId, @GroupId, @GroupName, @GroupChatObject, @TeamName`);
}

export const UspGetUsersById = async (id: string): Promise<any> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('userId', sql.VarChar, id);
  const users = query(request, `EXEC [IAM].[bot].[Usp_Get_Users_By_Id] @appId, @userId`)
  if(users[0] !== null)
    return users[0]

  return null;
}

export const UspGetUsersByUPN = async (upn: string): Promise<any> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('UPN', sql.VarChar, upn);

  const users = query(request, `EXEC [IAM].[bot].[Usp_Get_Users_By_UPN] @appId, @UPN`);
  if(users[0] !== null)
    return users[0]

  return null;
}

export const UspGetGroupChatById = async (id: string): Promise<any> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('groupId', sql.VarChar, id);

  const groups = query(request, `EXEC [IAM].[bot].[Usp_Get_GroupChat_By_Id] @appId, @groupId`);
  if(groups[0] !== null)
    return groups[0]

  return null;
}