import "./WorkplaceTable.css";

export const WorkplaceTable = ({tableData, date, name}: any) => {
  if(!tableData || !date || !name) {
    return (<div></div>);
  }
  return (
  <table style={{border: "1px solid"}}>
    <tr>
      <td colSpan={2}>
      </td>
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
      <td rowSpan={2}>
        {n}
      </td>
      <td>
        오전
      </td>
      {date?.map((d: string) => {
        return (
          <td> {tableData?.get(`${d}${n}오전`)} </td>
        )
      })}
      </tr>
      <tr>
      <td>
        오후
      </td>
      {date?.map((d: string) => {
        return (
          <td> {tableData?.get(`${d}${n}오후`)} </td>
        )
      })}
      </tr>
      </>
    );
  })}
  </table>
  );
}
