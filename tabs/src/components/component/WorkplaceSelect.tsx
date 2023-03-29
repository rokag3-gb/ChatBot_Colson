import "./WorkplaceTable.css";
import { useContext, useState, useEffect } from "react";
import { TeamsFxContext } from "../Context";
import axios from 'axios'

export const WorkplaceSelect = ({workplaceData, environment, date, name, UPN, time, workCode}: any) => {
  const [options, setOptions] = useState<any>();
  const { teamsfx } = useContext(TeamsFxContext);

  useEffect(() => {
    const arr = [];
    arr.push({ label: 'ㅤ',  value: 'ㅤ'});
    for(let item of workCode) {
      arr.push({
        label: item[0], 
        value: item[0]
      });
    }
    setOptions(arr);
  }, [workCode]);

  const onChangeWorkplace = async (event: any) => {
    let amValue;
    let pmValue;
    let amText;
    let pmText;

    try {
      if(time === 'am') {
        amText = event.target.value;
        pmText = (document.getElementById(date+name+'pm') as HTMLTextAreaElement).value;
      } else {
        amText = (document.getElementById(date+name+'am') as HTMLTextAreaElement).value;
        pmText = event.target.value;
      }
  
      amValue = workCode.get(amText);
      pmValue = workCode.get(pmText);
      
      const token = await teamsfx?.getCredential().getToken('');
  
      await axios.post(`${environment}/api/setWorkplace`, {
        workDate: date.split('(')[0],
        upn: UPN,
        workCodeAM: !amValue?'':amValue,
        workCodePM: !pmValue?'':pmValue,
      }, {
        headers: {
          authorization: 'Bearer ' + token?.token,
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <select id={date+name+time} onChange={onChangeWorkplace}>
      {options?.map((d: any) => {
        {
          if(workplaceData===d.value) {
            return (<option value={d.value} selected>{d.label}</option>)
          } else {
            return (<option value={d.value}>{d.label}</option>)
          }
        }
      })}
    </select>
  );
}
