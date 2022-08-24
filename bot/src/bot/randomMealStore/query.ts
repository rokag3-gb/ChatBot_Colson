import { sql } from "../../mssql"
import { query } from "../common";

export const UspLotMealStore = async (upn: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('UPN', sql.VarChar, upn);

  return query(request, `EXEC [IAM].[bot].[Usp_Lot_Meal_Store]`);
}

export const UspSetMealStoreLotsPick = async (LotId: Int16Array, SaveId: string, PickedStoreId: Int16Array): Promise<any[]> => {
  const request = new sql.Request();
  request.input('LotId', sql.VarChar, LotId);
  request.input('SaveId', sql.VarChar, SaveId);
  request.input('PickedStoreId', sql.VarChar, PickedStoreId);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_Meal_Store_Lots_Pick] @StoreName, @SaveId, @CategoryCSV`);
}