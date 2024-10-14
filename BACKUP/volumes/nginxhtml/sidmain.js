
doLoaded = () => {


    document.getElementById("menu").addEventListener('change',doMenuChanged.bind(this));
    

}

function setInfoText(text) {
    document.getElementById("infotext").textContent = text;
}

oPuzzle = null;

function setupPuzzle(puzzleData) {
    setInfoText("Please wait: the puzzle is being solved...");
    oPuzzle = new SidukoPuzzle();
    if (typeof(puzzleData) === "object" && puzzleData.length >0) {
        oPuzzle.setPuzzleStartData(puzzleData);
    }
    const generator = new SidukoHtmlGenerator(oPuzzle);
    const tableDOM = generator.getPuzzleDOM();
    const puzzleElementHolder = document.getElementById("everywhere");
    puzzleElementHolder.textContent = "";
    puzzleElementHolder.appendChild(tableDOM);
    
    if (puzzleData) {
        const solver = new SidukoSolver(oPuzzle, doPuzzleSolved);
        solver.execute();
    } else {
        // change the ownership, and don't leak
        const eventHandler = new SidukoEventsHandler(oPuzzle, tableDOM);
    }
    document.getElementById("solvebutton").addEventListener('click',doSolvePressed.bind(oPuzzle));
}


doSolvePressed = (oEv) => {
    const startValues = oPuzzle.data.cells.map(o => o.value);
    setupPuzzle(startValues);
}


doMenuChanged = (oEv) => {
    btn = document.getElementById("solvebutton");
    switch (oEv.target.value) {
        case "Difficult":
            btn.hidden = true;
            btn.disabled = true;
    
            oEv.target.disabled = true;
            setupPuzzle(shinningStarData);
            break;            
        case "Easier":
            btn.hidden = true;
            btn.disabled = true;
    
            oEv.target.disabled = true;
            setupPuzzle(evilPuzzleData);
            break;
        case "Custom":            
            setupPuzzle();
            setInfoText("Use arrow keys and numeric keys to setup a puzzle");
            btn.hidden = false;
            btn.disabled = false;
            
            break;
        default:
            break
    }
}

function doPuzzleSolved(info) {
    setInfoText(info);
    window.setTimeout(() => {
        document.getElementById("menu").disabled = false;
        let a = document.getElementsByClassName("suggested");
        [].forEach.call(a,(el) => {
            try {
                el.classList.remove("suggested");
            } catch {

            }
        });
        document.getElementById("solvebutton").hidden = false;
    },200);
    
}

const shinningStarData = [0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 7, 0, 0, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 3, 8, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 1, 0, 0, 6, 0, 8, 0, 2, 0, 0, 0, 4, 0, 6, 0, 0, 0, 0, 7, 2, 0, 0, 0, 0, 9, 0, 6, 0];
const evilPuzzleData = [9, 0, 0, 0, 4, 3, 1, 6, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 9, 0, 8, 0, 0, 0, 1, 9, 3, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 6, 0, 0, 0, 0, 7, 0, 6, 4, 0, 0, 3, 4, 0, 0, 2, 0, 0, 0, 0, 0];




class SidukoPuzzle {
    #rowCells = [];
    #columnCells = [];
    #innerTableCells = [];
    constructor() {
        this.data = new SidukoPuzzleData();

        // Optimisation. Build a collection of the cells in each column, row and inner table
        for (let i = 0; i < 9; i++) {
            this.#rowCells[i] = this.data.cells.filter(oCell => oCell.row === i);
            this.#columnCells[i] = this.data.cells.filter(oCell => oCell.column === i);
            this.#innerTableCells[i] = this.data.cells.filter(oCell => oCell.innerTableIndex === i);
        }
    }


    setPuzzleStartData(aStartData) {
        aStartData.forEach((iValue, iIndex) => {
            const oCell = this.data.cells[iIndex];
            if (iValue > 0) {
                oCell.value = iValue;
                oCell.setFixed();
            }
        })
    }
}