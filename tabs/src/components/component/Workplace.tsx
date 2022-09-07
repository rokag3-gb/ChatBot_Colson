import { useContext, useState, useEffect } from "react";
import "./Workplace.css";
import { useData } from "@microsoft/teamsfx-react";
import { TeamsFxContext } from "../Context";
import axios from 'axios'
import { WorkplaceTable } from './WorkplaceTable'

import Select from 'react-select'

export function Workplace(props: { environment?: string }) {
  const { environment } = {
    environment: window.location.hostname === "localhost" ? "http://localhost:3978" : "https://colsonahat86dfc5bot.azurewebsites.net",
    ...props,
  };

  const { teamsfx } = useContext(TeamsFxContext);
  const { loading, data, error } = useData(async () => {
    if (teamsfx) {
      const userInfo = await teamsfx.getUserInfo();
      return userInfo;
    }
  });
  
  const getToday = (day: number) => {
    const now = new Date();
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
    const koreaTimeDiff = 9 * 60 * 60 * 1000; 
    const date = new Date(utcNow + koreaTimeDiff);

    if(day) {
      date.setDate(date.getDate() + day);
    }
    return date.getFullYear() + "-" + ("00" + (1 + date.getMonth())).slice(-2) + "-" + ("00" + date.getDate()).slice(-2);
  }

  const [startDate, setStartDate] = useState(getToday(0));
  const [endDate, setEndDate] = useState(getToday(2));
  const [team, setTeam] = useState('');
  
  const [tableData, setTableData] = useState<Map<string, string>>();
  const [date, setDate] = useState<string[]>();
  const [name, setName] = useState<string[]>();
  const [options, setOptions] = useState<any[]>();
  const [defaultTeam, setDefaultTeam] = useState(0);

  useEffect(() => {
    console.log('getTeam');
    axios.get(`${environment}/api/getTeam?UPN=${upn}`).then(res => {
      const option = [];
      for(let i = 0; i < res.data.length; i++) {
        const data  = res.data[i];
        option.push({
          label: data.TeamName,
          value: data.TeamAbbrName
        });
        if(data.userTeam === 1) {
          setDefaultTeam(i);
          setTeam(data.TeamAbbrName);
        }
      }
      setOptions(option);
    });
  }, []);

  useEffect(() => {
    if(team?.length === 0) {
      return;
    }

    axios.get(`${environment}/api/getWorkplace?startDate=${startDate}&endDate=${endDate}&team=${team}`).then(res => {
      const obj = new Map<string, string>();
      const dateSet = new Set<string>();
      const nameSet = new Set<string>();

      console.log(res.data);
      for (const data of res.data) {
        const dateText = data.Date + '(' + data.Weekname + ')';
        if(data.Date !== null && data.Weekname !== null) {
          dateSet.add(dateText);
        }
        if(data.DisplayName === undefined || data.DisplayName === null) {
          continue;
        }
        nameSet.add(data.DisplayName);
        obj.set(dateText + data.DisplayName + data.WorkTimeKR, data.Workplace);
      }
      
      setDate(Array.from(dateSet).sort());
      setName(Array.from(nameSet).sort());
      setTableData(obj);
    });

  }, [data, endDate, startDate, team]);

  //나중에 컴포넌트로 빼서 처리하기 쉽게 바꿔야겠다...
  useEffect(() => {
    if(options === undefined) {
      return;
    }

    for(let i = 0; i < options.length; i++) {
      if(options[i].value === team) {
        setDefaultTeam(i);
      }
    }
  }, [team]);

  
  const userName = (loading || error) ? "" : data!.displayName;
  const upn = (loading || error) ? "kwangseok.moon@cloudmt.co.kr" : data!.preferredUserName;

  const customStyles = {
    control: () => ({
      width: 100,
    })
  }

  return (
    <div className="welcome page">
      <div className="page-padding">
        <h1>근무지를 조회합니다.</h1>
      
      <input type="date" id="start" name="trip-start"
        onChange={(event) => setStartDate(event.target.value)}
        value={startDate}>
      </input>
      
      <input type="date" id="start" name="trip-start"
        onChange={(event) => setEndDate(event.target.value)}
        value={endDate}>
      </input>

      <div className="selectBox">
        <Select
          value={options?options[defaultTeam]:''}
          isSearchable={false}
          onChange={(event: any) => setTeam(event.value)}
          options={options}
        />
      </div>
        <WorkplaceTable tableData={tableData} date={date} name={name} />
      </div>
    </div>
  );
}
