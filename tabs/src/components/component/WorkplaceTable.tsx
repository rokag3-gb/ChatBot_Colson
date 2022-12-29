import "./WorkplaceTable.css";
import { WorkplaceSelect } from './WorkplaceSelect'
import { GetToday } from './Workplace'

export const WorkplaceTable = ({tableData, userName, date, name, environment, UPN, workCode}: any) => {
  const today = GetToday(0);

  if(!tableData || !date || !name) {
    return (<div></div>);
  }

  return (
  <div style={{width: "100%", display: "flex"}}>
    <table className="UserTable">
      <tr>
        <th colSpan={2}>ㅤ<br/>ㅤ</th>
      </tr>
    {name?.map((n: string) => {
      return (
        <>
        <tr>
        <td className="TableSticky" rowSpan={2}>
          {n}
        </td>
        </tr>
        <tr>
        </tr>
        </>
      );
    })}
    </table>

    <div style={{width: "100%", height: "100%"}}>
      <table>
        <tr>
        <th>
        </th>
          {date?.map((d: string) => {
            let c = '';
            if(today===d.substring(0, d.indexOf('('))) {
              c += 'todayCell ';
            }

            return (
              <th className={c}>
                {d.substring(0, d.indexOf('('))}
                <br/>
                {d.substring(d.indexOf('('))}
              </th>
            )
          })}
        </tr>
        {name?.map((n: string) => {
          return (
            <>
            <tr>
        <td>
          <b>오전</b>
        </td>
            {date?.map((d: string) => {
              const getText = `${d}${n}오전`;
              let c = '';
              if(userName===n) {
                c += 'userCell ';
              }
              if(today===d.substring(0, d.indexOf('('))) {
                c += 'todayCell ';
              }

              return (
                <td className={c}> 
                  {userName!==n?
                  tableData?.get(getText)?tableData?.get(getText):'ㅤ':
                  <WorkplaceSelect 
                    environment={environment} 
                    workplaceData={tableData?.get(getText)?tableData?.get(getText):' '} 
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
        <td>
          <b>오후</b>          
        </td>
            {date?.map((d: string) => {
              const getText = `${d}${n}오후`;
              let c = '';
              if(userName===n) {
                c += 'userCell ';
              }
              if(today===d.substring(0, d.indexOf('('))) {
                c += 'todayCell ';
              }
              return (
                <td className={c}> 
                  {userName!==n?
                  tableData?.get(getText)?tableData?.get(getText):'ㅤ':
                  <WorkplaceSelect 
                    environment={environment} 
                    workplaceData={tableData?.get(getText)?tableData?.get(getText):' '} 
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
      </table>
    </div>
  </div>
  );
}
