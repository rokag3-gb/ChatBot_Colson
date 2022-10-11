import "./WorkplaceTable.css";
import { useState, useEffect } from "react";
import Select from 'react-select'

export const WorkplaceSelect = ({workplaceData}: any) => {
  const options = [{label: '', value: ''}, 
                  {label: '사무실', value: '사무실'},
                  {label: '재택근무', value: '재택근무'},
                  {label: '외부근무', value: '외부근무'},
                  {label: '휴무', value: '휴무'}];
  const [wrokplace, setWrokplace] = useState(workplaceData);

  const customStyles = {
    control: (base: any) => ({
      ...base,
      background: "#0000",
      fontSize: "0.75rem"
    })
  };

  useEffect(() => {
    console.log('workplaceData ' + wrokplace);
  }, [wrokplace]);

  return (
    <Select
      value={{label: wrokplace, value: wrokplace}}
      hideSelectedOptions={true}
      onChange={(event: any) => setWrokplace(event.value)}
      options={options}
      components={{ DropdownIndicator:() => null, IndicatorSeparator:() => null }}
      styles={customStyles}
    />

  );
}
