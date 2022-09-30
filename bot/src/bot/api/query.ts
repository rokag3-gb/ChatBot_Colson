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
  request.input('search', sql.VarChar, search);

  return query(request, `SELECT StoreId
      , StoreName
      , Category
      , Address
      , URL
      , StoreTag
    FROM (SELECT	StoreId
      , StoreName
      , Category
      , Address
      , URL
      , StoreTag = STUFF((SELECT ',' + t.Tag
        FROM [IAM].[dbo].[Meal_Store_Tag] t 
        WHERE t.StoreId = M.StoreId
        FOR XML PATH('')), 1, 1, '')
    FROM	[IAM].[dbo].[Meal_Store] M
    WHERE IsUse = 1) S
    WHERE S.StoreName LIKE '%' + @search + '%'
    OR	S.Address LIKE '%' + @search + '%'
    OR	S.StoreTag LIKE '%' + @search + '%'`);
}

export const UspGetTag = async (storeId: number): Promise<any[]> => {
  const request = await getRequest();
  request.input('storeId', sql.BigInt, storeId);
  return query(request, `SELECT Tag FROM [IAM].[dbo].[Meal_Store_Tag] WHERE StoreId = @storeId`);
}

export const UspSetTag = async (storeId: number, tag: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('storeId', sql.BigInt, storeId);
  request.input('tag', sql.NVarChar, tag);
  return query(request, `INSERT INTO [IAM].[dbo].[Meal_Store_Tag] (Tag, StoreId) VALUES (@tag, @storeId)`);
}

export const UspDeleteTag = async (storeId: number, tag: string): Promise<any[]> => {
  const request = await getRequest();
  request.input('storeId', sql.BigInt, storeId);
  request.input('tag', sql.NVarChar, tag);
  return query(request, `DELETE [IAM].[dbo].[Meal_Store_Tag] WHERE Tag = @tag AND StoreId = @storeId`);
}