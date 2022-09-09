import "./WorkplaceTable.css";

export const WorkplaceTable = ({tableData, date, name}: any) => {
  if(!tableData || !date || !name) {
    return (<div></div>);
  }
  return (
  <div style={{width: "100%", display: "flex"}}>

    <table style={{border: "1px solid", height: "100%", background: "#fff", left:0}}>
      <tr>
        <td colSpan={2}>ㅤ</td>
      </tr>
    {name?.map((n: string) => {
      return (
        <>
        <tr>
        <td rowSpan={2}>
          {n}
        </td>
        <td>
          오전
        </td>
        </tr>
        <tr>
        <td>
          오후
        </td>
        </tr>
        </>
      );
    })}
    </table>

    <div style={{width: "100%", height: "100%", overflowX: "scroll"}}>
      <table style={{border: "1px solid"}}>
        <tr>
          {console.log(date)}
          {date?.map((d: string) => {
            return (
              <td>{d} </td>
            )
          })}
        </tr>
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
      </table>
    </div>
  </div>
  );
}
