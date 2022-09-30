import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query, getToday } from "../common";


export const UspGetWorkCode = async (): Promise<any[]> => {
  const request = await getRequest();
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Work_Code]`);
}
export const UspGetUserWorkplace = async (UPN: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('date', sql.VarChar, getToday(null));
  request.input('UPN', sql.VarChar, UPN);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users_Workplace] @date, @UPN`);
}

export const UspGetUserWorkplaceSend = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users_Workplace_All] @date, @appId`);
}

export const UspGetUserWorkplaceResend = async (): Promise<any[]> => {
  const request = await getRequest();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  request.input('date', sql.VarChar, getToday(null));
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users_Workplace_Resend] @date, @appId`);
}
         
export const UspSetWorkplace = async (workDate: string, upn: string, workCodeAM: string, workCodePM: string, userPrincipalName: string): Promise<any[]> => {
  const request = await getRequest();
  request.input("WorkDate", sql.VarChar, workDate) ;
  request.input('UPN', sql.VarChar, upn);
  request.input('WorkCodeAM', sql.VarChar, workCodeAM);
  request.input('WorkCodePM', sql.VarChar, workCodePM);
  request.input('SaverUPN', sql.VarChar, userPrincipalName);
  return query(request, `EXEC [IAM].[bot].[Usp_Set_Workplace] @WorkDate, @UPN, @WorkCodeAM, @WorkCodePM, @SaverUPN`);
}