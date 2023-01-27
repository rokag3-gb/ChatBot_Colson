import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const UspSetMealParty = async (partyId: string, title: string, maxNumberOfPeople: string, createId: string): Promise<any[]> => {
    const request = await getRequest();
    request.input('AppId', sql.VarChar, process.env.BOT_ID);
    request.input('partyId', sql.VarChar, partyId);
    request.input('title', sql.VarChar, title);
    request.input('maxNumberOfPeople', sql.VarChar, maxNumberOfPeople);
    request.input('createId', sql.VarChar, createId);
  
    const result = await query(request, `INSERT INTO [IAM].[bot].[MealParty]
               ([AppId]
               ,[partyId]
               ,[title]
               ,[maxNumberOfPeople]
               ,[createId])
         VALUES
               (@AppId, @partyId, @title, @maxNumberOfPeople, @createId)`);

    console.log('result = ' + result);
    return result;
}

export const UspSetMealPartyMember = async (partyId: string, appUserId: string, aadObjectId: string): Promise<any[]> => {
    const request = await getRequest();
    request.input('partyId', sql.VarChar, partyId);
    request.input('appUserId', sql.VarChar, appUserId);
    request.input('aadObjectId', sql.VarChar, aadObjectId);
  
    const result = await query(request, `INSERT INTO [IAM].[bot].[MealPartyMember]
               ([partyId]
                ,[appUserId]
                ,[aadObjectId])
         VALUES
               (@partyId, @appUserId, @aadObjectId)`);

    console.log('result = ' + result);
    return result;
}

export const CheckUser = async (AppUserId: string): Promise<boolean> => {
    const request = await getRequest();
    request.input('AppUserId', sql.VarChar, AppUserId);
  
    const rows = await query(request, `SELECT PM.AppUserId
    FROM [IAM].[bot].[MealPartyMember] PM
    JOIN [IAM].[bot].[MealParty] P
    ON PM.partyId = P.partyId AND P.isClose = 0
    WHERE PM.AppUserId = @AppUserId`);

    if(rows.length == 0) {
      return true;
    } 

    return false;
}

export const CheckParty = async (partyId: string): Promise<boolean> => {
    const request = await getRequest();
    request.input('partyId', sql.VarChar, partyId);
  
    const rows = await query(request, `IF
    (SELECT maxNumberOfPeople FROM [IAM].[bot].[MealParty] WHERE partyId = @partyId AND isClose = 0)
    >
    (SELECT COUNT(memberId) AS maxNumberOfPeople FROM [IAM].[bot].[MealPartyMember] WHERE partyId = @partyId)
    BEGIN
      SELECT 1 AS result
    END ELSE BEGIN
      SELECT 0 AS result
    END`);

    if(rows[0].result == 1) {
      return true;
    } 

    return false;
}

export const GetPartyMember = async (partyId: string) => {
    const request = await getRequest();
    request.input('partyId', sql.VarChar, partyId);
  
    return await query(request, `SELECT aadObjectId FROM [IAM].[bot].[MealPartyMember] WHERE partyId = @partyId`);
}

export const UspSetPartyClose = async (partyId: string): Promise<any[]> => {
    const request = await getRequest();
    request.input('partyId', sql.VarChar, partyId);
  
    const result = await query(request, `UPDATE [IAM].[bot].[MealParty] SET isClose = 1 WHERE partyId = @partyId`);

    console.log('result = ' + result);
    return result;
}