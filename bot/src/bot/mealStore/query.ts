import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const UspGetMealStoreCategory = async (): Promise<any[]> => {
  const request = await getRequest();

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store_Category]`);
}

export const UspGetMealStore = async (StoreName: string, CategoryCSV: string, PageNo: number): Promise<any[]> => {
  const request = await getRequest();
  if(StoreName === undefined)
    StoreName = null;
  request.input('StoreName', sql.VarChar, StoreName);
  request.input('CategoryCSV', sql.VarChar, CategoryCSV);
  request.input('PageNo', sql.Int, PageNo);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store] @StoreName, @CategoryCSV, @PageNo`);
}