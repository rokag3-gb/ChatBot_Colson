import { sql } from "../../mssql"
import { query } from "../common";

export const UspLotMealStore = async (upn: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('UPN', sql.VarChar, upn);

  return query(request, `EXEC [IAM].[bot].[Usp_Lot_Meal_Store] @UPN`);
}

export const UspSetMealStoreLotsPick = async (LotId: number, SaveId: string, PickedStoreId: number): Promise<any[]> => {
  const request = new sql.Request();
  request.input('LotId', sql.Int, LotId);
  request.input('SaveId', sql.VarChar, SaveId);
  request.input('PickedStoreId', sql.Int, PickedStoreId);

  return query(request, `EXEC [IAM].[bot].[Usp_Set_Meal_Store_Lots_Pick] @LotId, @SaveId, @PickedStoreId`);
}