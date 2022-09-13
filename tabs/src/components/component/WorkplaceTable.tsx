import "./WorkplaceTable.css";

export const WorkplaceTable = ({tableData, date, name}: any) => {
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
                  <td> {tableData?.get(`${d}${n}오전`)?tableData?.get(`${d}${n}오전`):'ㅤ'} </td>
                )
              })}
              </tr>
              <tr>
              {date?.map((d: string) => {
                return (
                  <td> {tableData?.get(`${d}${n}오후`)?tableData?.get(`${d}${n}오후`):'ㅤ'} </td>
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
