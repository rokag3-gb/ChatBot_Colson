import "./WorkplaceTable.css";
import { useState, useEffect } from "react";
import Select from 'react-select'
import axios from 'axios'

export const WorkplaceSelect = ({workplaceData, environment, date, name, UPN, time, workCode}: any) => {
  const [workplace, setWrokplace] = useState(workplaceData);
  const [options, setOptions] = useState<any>();

  const customStyles = {
    control: (base: any) => ({
      ...base,
      background: "#0000",
      fontSize: "0.75rem",
      fontWeight: "bold "
    })
  };

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
  }, []);

  const onChangeWorkplace = (workplaceValue: string) => {
    let amValue;
    let pmValue;
    let amText;
    let pmText;

    if(time === 'am') {
      amText = workplaceValue;
      pmText = document.getElementById(date+name+'pm')?.textContent;
    } else {
      amText = document.getElementById(date+name+'am')?.textContent;
      pmText = workplaceValue;
    }

    console.log(JSON.stringify(workCode));
    amValue = workCode.get(amText);
    pmValue = workCode.get(pmText);
    console.log('amText = ' + amText);
    console.log('amValue = ' + amValue);
    console.log('pmText = ' + pmText);
    console.log('pmValue = ' + pmValue);
    console.log('UPN = ' + UPN);

    axios.post(`${environment}/api/setWorkplace`, {
      workDate: date.split('(')[0],
      upn: UPN,
      workCodeAM: !amValue?'':amValue,
      workCodePM: !pmValue?'':pmValue,
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
