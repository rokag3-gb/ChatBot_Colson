import { sql } from "../../mssql"
import { query } from "../common";

export const UspGetMealStoreCategory = async (): Promise<any[]> => {
  const request = new sql.Request();

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store_Category]`);
}

export const UspGetMealStore = async (StoreName: string, CategoryCSV: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('StoreName', sql.VarChar, StoreName);
  request.input('CategoryCSV', sql.VarChar, CategoryCSV);

  return query(request, `EXEC [IAM].[bot].[Usp_Get_Meal_Store] @StoreName, @CategoryCSV`);
}