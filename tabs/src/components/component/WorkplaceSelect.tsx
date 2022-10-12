import "./WorkplaceTable.css";
import { useState, useEffect } from "react";
import Select from 'react-select'
import axios from 'axios'

export const WorkplaceSelect = ({workplaceData, environment, date, name, UPN, time}: any) => {
  const options = [{label: 'ㅤ', value: ' '}, 
                  {label: '사무실', value: '사무실'},
                  {label: '재택근무', value: '재택근무'},
                  {label: '외부근무', value: '외부근무'},
                  {label: '휴무', value: '휴무'}];
  const [workplace, setWrokplace] = useState(workplaceData);

  const customStyles = {
    control: (base: any) => ({
      ...base,
      background: "#0000",
      fontSize: "0.75rem",
      fontWeight: "bold "
    })
  };

  const onChangeWorkplace = (workplaceValue: string) => {
    let amValue;
    let pmValue;

    if(time === 'am') {
      amValue = workplaceValue;
      pmValue = document.getElementById(date+name+'pm')?.textContent;
    } else {
      amValue = document.getElementById(date+name+'am')?.textContent;
      pmValue = workplaceValue;
    }

    axios.post(`${environment}/api/setWorkplace`, {
      workDate: date.split('(')[0],
      upn: UPN,
      workCodeAM: amValue,
      workCodePM: pmValue
    }).then(res => {
      setWrokplace(workplaceValue);
    });
  }

  return (
    <Select
      value={{label: workplace, value: workplace}}
      hideSelectedOptions={true}
      onChange={(event: any) => onChangeWorkplace(event.value)}
      options={options}
      components={{ DropdownIndicator:() => null, IndicatorSeparator:() => null }}
      styles={customStyles}
    />

  );
}
