import { useContext, useState, useEffect } from "react";
import "./Workplace.css";
import { useData } from "@microsoft/teamsfx-react";
import { TeamsFxContext } from "../Context";
import axios from 'axios'
import { WorkplaceTable } from './WorkplaceTable'

import Select from 'react-select'
  
export const GetToday = (day: number) => {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); 
  const koreaTimeDiff = 9 * 60 * 60 * 1000; 
  const date = new Date(utcNow + koreaTimeDiff);


  if(day) {
    date.setDate(date.getDate() + day);
  }
  return date.getFullYear() + "-" + ("00" + (1 + date.getMonth())).slice(-2) + "-" + ("00" + date.getDate()).slice(-2);
}

export const GetNextFriday = () => {
  const now = new Date();
  now.setDate(now.getDate() + 5);
  const currentDay = now.getDay();
  const daysUntilFriday = currentDay <= 5 ? 5 - currentDay : 5 + (7 - currentDay); // Calculate days until next Friday
  const nextFriday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);

  const year = nextFriday.getFullYear();
  const month = String(nextFriday.getMonth() + 1).padStart(2, '0');
  const day = String(nextFriday.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export function Workplace(props: { environment?: string }) {
  const { environment } = {
    environment: window.location.hostname === "localhost" ? "http://localhost:3978" : "https://cloudmtbotdev2ecceebot.azurewebsites.net",
    ...props,
  };
  
  const { teamsfx } = useContext(TeamsFxContext);
  const { data } = useData(async () => {
    if (teamsfx) {
      const userInfo = await teamsfx.getUserInfo();
      setUPN(userInfo!.preferredUserName);
      return userInfo;
    }
  });

  const [startDate, setStartDate] = useState(GetToday(-1));
  const [endDate, setEndDate] = useState(GetNextFriday());
  const [team, setTeam] = useState('');
  
  const [tableData, setTableData] = useState<Map<string, string>>();
  const [workCode, setWorkCode] = useState<Map<string, string>>();
  const [userName, setUserName] = useState<string>('');
  const [date, setDate] = useState<string[]>();
  const [name, setName] = useState<string[]>();
  const [options, setOptions] = useState<any[]>();
  const [defaultTeam, setDefaultTeam] = useState(0);
  const [UPN, setUPN] = useState('');

  useEffect(() => {
    if(UPN?.length === 0) {
      return;
    }

    try {
      teamsfx?.getCredential().getToken('').then(token => {
        axios.get(`${environment}/serviceapi/getTeam?UPN=${UPN}`,{
          headers: {
            authorization: 'Bearer ' + token?.token,
          },
        }).then(res => {
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
      });
    } catch(e) {
      console.log(e);
    }
    
    teamsfx?.getCredential().getToken('').then(token => {
      axios.get(`${environment}/serviceapi/getWorkCode`,{
        headers: {
          authorization: 'Bearer ' + token?.token,
        },
      }).then(res => {
        console.log(JSON.stringify(res.data));
        const obj = new Map<string, string>();
        for (const data of res.data) {
          obj.set(data.Name, data.Code);
        }
        setWorkCode(obj);
      })
    });
  }, [UPN, environment]);

  useEffect(() => {
    if(team?.length === 0) {
      return;
    }

    teamsfx?.getCredential().getToken('').then(token => {
      axios.get(`${environment}/serviceapi/getWorkplace?startDate=${startDate}&endDate=${endDate}&team=${team}`,{
        headers: {
          authorization: 'Bearer ' + token?.token,
        },
      }).then(res => {
        const obj = new Map<string, string>();
        const dateSet = new Set<string>();
        const nameSet = new Set<string>();

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

          if(userName === '' && data.UPN === UPN) {
            setUserName(data.DisplayName);
          }
        }
        
        setDate(Array.from(dateSet).sort());
        setName(Array.from(nameSet).sort());
        setTableData(obj);
      })
    });

  }, [data, endDate, startDate, team, UPN, environment]);

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
  }, [team, options]);

  return (
    <div className="welcome">
      <div className="page-padding">
        <h1>팀 근무지 조회</h1>
        <div className="workspaceBox">
          <div className="headerBox">
              <div className="virticalBox">
                <div className="dateLabelBox">
                  <div className="transformBox">
                    시작일
                  </div>
                  <input type="date"
                    onChange={(event) => setStartDate(event.target.value)}
                    value={startDate}>
                  </input>
                </div>
                <div className="dateLabelBox">
                  <div className="transformBox">
                    종료일
                  </div>
                  <input type="date"
                    onChange={(event) => setEndDate(event.target.value)}
                    value={endDate}>
                  </input>
                </div>
            </div>
            <div className="selectBox">
              <Select
                value={options?options[defaultTeam]:''}
                isSearchable={false}
                onChange={(event: any) => setTeam(event.value)}
                options={options}
              />
            </div>
          </div>
          <WorkplaceTable tableData={tableData} date={date} name={name} userName={userName} environment={environment} UPN={UPN} workCode={workCode}/>
        </div>
      </div>
    </div>
  );
}
