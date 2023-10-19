import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
        <ChevronLeftIcon />
      </Button>
      <Button onClick={handleNext}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
};

export default GridToolbar;
