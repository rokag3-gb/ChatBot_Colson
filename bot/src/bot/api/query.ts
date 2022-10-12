import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const UspGetWorkplaceTeam = async (startDate: string, endDate: string, team: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('startDate', sql.VarChar, startDate);
  request.input('endDate', sql.VarChar, endDate);
  request.input('team', sql.VarChar, team);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Workplace_TeamUsers] @startDate, @endDate, @team`);
}
    
export const UspGetTeam = async (upn: string): Promise<any[]> => {
  const request = await getRequest();
  await request.input('UPN', sql.VarChar, upn);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Teams] @UPN`)
}

export const UspGetStore = async (search: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('Search', sql.VarChar, search);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store_Tab] @Search, 1`);
}

export const UspGetTag = async (storeId: number): Promise<any[]> => {
  const request = await getRequest();
  request.input('StoreId', sql.BigInt, storeId);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store_Tag] @StoreId`);
}

export const UspSetTag = async (storeId: number, tag: string, UPN: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('StoreId', sql.BigInt, storeId);
  request.input('Tag', sql.NVarChar, tag);
  request.input('UPN', sql.VarChar, UPN);
  return query(request, `EXEC [IAM].[bot].[Usp_Set_Meal_Store_Tag] @StoreId, @Tag, @UPN`);
}

export const UspDeleteTag = async (storeId: number, tag: string, UPN: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('StoreId', sql.BigInt, storeId);
  request.input('Tag', sql.NVarChar, tag);
  request.input('UPN', sql.VarChar, UPN);
  return query(request, `EXEC [IAM].[bot].[Usp_Set_Meal_Store_Tag_Delete] @StoreId, @Tag, @UPN`);
}
         
export const UspSetWorkplace = async (workDate: string, upn: string, workCodeAM: string, workCodePM: string): Promise<any[]> => {
  const request = await getRequest();
  request.input("WorkDate", sql.VarChar, workDate) ;
  request.input('UPN', sql.VarChar, upn);
  request.input('WorkCodeAM', sql.VarChar, workCodeAM);
  request.input('WorkCodePM', sql.VarChar, workCodePM);
  request.input('SaverUPN', sql.VarChar, upn);
  return query(request, `EXEC [IAM].[bot].[Usp_Set_Workplace] @WorkDate, @UPN, @WorkCodeAM, @WorkCodePM, @SaverUPN`);
}