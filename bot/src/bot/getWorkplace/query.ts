import { sql } from "../../mssql"
import { query } from "../common";

export const UspGetUsers = async (): Promise<any[]> => {
  const request = new sql.Request();
  request.input('appId', sql.VarChar, process.env.BOT_ID);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Users] @appId`);
}

export const UspGetWorkplace = async (name: string, date: Int16Array): Promise<any[]> => {
  const request = new sql.Request();
  request.input('Username', sql.VarChar, name);
  request.input('date', sql.Int, 7);
  return query(request, `EXEC [IAM].[bot].[Usp_Get_Workplace] @Username, @date`);
}

export const UspGetWorkplaceTest = async (startDate: string, endDate: string, team: string): Promise<any[]> => {
  const request = new sql.Request();
  request.input('startDate', sql.VarChar, startDate);
  request.input('endDate', sql.VarChar, endDate);
  request.input('team', sql.VarChar, team);
  return query(request, `SELECT 
  U.UPN
  , U.DisplayName
  , CONVERT(VARCHAR(10), C.Date, 120) AS Date
  , Weekname = CASE WHEN(C.WeekNum = '1') THEN '일'
		WHEN(C.WeekNum = '2') THEN '월'
		WHEN(C.WeekNum = '3') THEN '화'
		WHEN(C.WeekNum = '4') THEN '수'
		WHEN(C.WeekNum = '5') THEN '목'
		WHEN(C.WeekNum = '6') THEN '금'
		WHEN(C.WeekNum = '7') THEN '토'
		END
  , W.Workplace
  , W.WorkTimeKR
  FROM (SELECT UPN, TeamAbbrName, DisplayName FROM [IAM].[bot].[VW_User] WHERE TeamAbbrName = @team) U
  LEFT JOIN 
  (SELECT UPN, WorkDate, Workplace, WorkTimeKR FROM [IAM].[bot].[VW_Workplace] WHERE WorkDate >= @startDate AND WorkDate <= @endDate) W
  ON U.UPN = W.UPN
  FULL OUTER JOIN
  (SELECT Date, WeekNum FROM [IAM].[dbo].[Calendar] WHERE Date >= @startDate AND Date <= @endDate AND IsDayOff = 0) C
  ON W.WorkDate = C.Date
  WHERE U.TeamAbbrName = @team OR U.DisplayName is NULL
  ORDER BY U.DisplayName`);
}