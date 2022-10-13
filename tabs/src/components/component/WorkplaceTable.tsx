import "./WorkplaceTable.css";
import { WorkplaceSelect } from './WorkplaceSelect'

export const WorkplaceTable = ({tableData, userName, date, name, environment, UPN, workCode}: any) => {
  if(!tableData || !date || !name) {
    return (<div></div>);
  }

  return (
  <div style={{width: "100%", display: "flex"}}>

    <table style={{height: "100%", left:0}}>
      <tr>
        <th colSpan={2}>ㅤ<br/>ㅤ</th>
      </tr>
    {name?.map((n: string) => {
      return (
        <>
        <tr>
        <th rowSpan={2}>
          {n}
        </th>
        <th>
          오전
        </th>
        </tr>
        <tr>
        <th>
          오후
        </th>
        </tr>
        </>
      );
    })}
    </table>

    <div style={{width: "100%", height: "100%", overflowX: "scroll"}}>
      <table>
        <tr>
          {date?.map((d: string) => {
            return (
              <th>
                {d.substring(0, d.indexOf('('))}
                <br/>
                {d.substring(d.indexOf('('))}
              </th>
            )
          })}
        </tr>
        <tbody>
          {name?.map((n: string) => {
            return (
              <>
              <tr>
              {date?.map((d: string) => {
                return (
                  <td id={d+n+'am'}> 
                    {userName!==n?
                    tableData?.get(`${d}${n}오전`)?tableData?.get(`${d}${n}오전`):'ㅤ':
                    <WorkplaceSelect 
                      environment={environment} 
                      workplaceData={tableData?.get(`${d}${n}오전`)?tableData?.get(`${d}${n}오전`):' '} 
                      date={d}
                      name={n} 
                      time='am'
                      UPN={UPN}
                      workCode={workCode}
                      />}
                  </td>
                )
              })}
              </tr>
              <tr>
              {date?.map((d: string) => {
                return (
                  <td id={d+n+'pm'}> 
                    {userName!==n?
                    tableData?.get(`${d}${n}오후`)?tableData?.get(`${d}${n}오후`):'ㅤ':
                    <WorkplaceSelect 
                      environment={environment} 
                      workplaceData={tableData?.get(`${d}${n}오후`)?tableData?.get(`${d}${n}오후`):' '} 
                      date={d}
                      name={n} 
                      time='pm'
                      UPN={UPN}
                      workCode={workCode}
                    />}
                  </td>
                )
              })}
              </tr>
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
}
