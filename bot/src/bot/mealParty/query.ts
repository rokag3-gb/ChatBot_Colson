import { getRequest } from "../../mssql"
const sql = require('mssql');
import { query } from "../common";

export const UspSetMealParty = async (partyId: string, title: string, maxNumberOfPeople: string, createId: string) => {
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