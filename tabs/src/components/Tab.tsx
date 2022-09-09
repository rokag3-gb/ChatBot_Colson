import { useContext } from "react";
import { Workplace } from "./component/Workplace";
import { TeamsFxContext } from "./Context";

export default function Tab() {
  const { themeString } = useContext(TeamsFxContext);
  return (
    <div className={themeString === "default" ? "" : "dark"}>
      <Workplace />
    </div>
  );
}