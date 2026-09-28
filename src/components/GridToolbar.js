import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Button } from "@mui/material";

const GridToolbar = ({ gridRows, setGridRows }) => {
  const handleNext = () => {
    let newGridRows = [...gridRows];
    newGridRows.push(newGridRows.shift());
    newGridRows[0].reaction = false;
    setGridRows(newGridRows);
  };

  const handleBack = () => {
    let newGridRows = [...gridRows];
    newGridRows.unshift(newGridRows.pop());
    setGridRows(newGridRows);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <Button onClick={handleBack}>
        <KeyboardArrowDownIcon />
      </Button>
      <Button onClick={handleNext}>
        <KeyboardArrowUpIcon />
      </Button>
    </div>
  );
};

export default GridToolbar;
