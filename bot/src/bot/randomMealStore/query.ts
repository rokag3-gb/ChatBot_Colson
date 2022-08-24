import { sql } from "../../mssql"
import { query } from "../common";

export const UspGetMealStoreCategory = async (upn: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('UPN', sql.VarChar, upn);

  return query(request, `EXEC [IAM].[bot].[Usp_Lot_Meal_Store]`);
}

export const UspGetMealStore = async (StoreName: string, CategoryCSV: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('StoreName', sql.VarChar, StoreName);
  request.input('CategoryCSV', sql.VarChar, CategoryCSV);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store] @StoreName, @CategoryCSV`);
}